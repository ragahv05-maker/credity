import { Router } from 'express';
import { verificationEngine } from '../services/verification-engine';
import { fraudDetector } from '../services/fraud-detector';
import { authMiddleware, verifyAccessToken } from '../services/auth-service';
import { storage, VerificationRecord } from '../storage';
import crypto from 'crypto';
import { idempotencyMiddleware, PostgresStateStore, signWebhook } from '@credverse/shared-auth';
import type {
    CandidateVerificationSummary,
    ProofVerificationRequestContract,
    ReasonCode,
    VerificationDecision,
    VerificationEvidence,
    VerificationResultContract,
    WorkScoreBreakdown,
} from '@credverse/shared-auth';
import { deterministicHash, deterministicHashLegacyTopLevel, parseCanonicalization, parseProofAlgorithm } from '../services/proof-lifecycle';
import { verifyProofContract, ProofVerificationError } from '../services/proof-verifier-service';
import { z } from 'zod';

const router = Router();
const writeIdempotency = idempotencyMiddleware({ ttlMs: 6 * 60 * 60 * 1000 });
const vpRequests = new Map<string, { id: string; nonce: string; createdAt: number; purpose: string; state?: string }>();
const MAX_JWT_BYTES = 16 * 1024;
const VP_REQUEST_TTL_MS = Number(process.env.OID4VP_REQUEST_TTL_MS || 15 * 60 * 1000);
const LEGACY_VERIFY_SUNSET_HEADER =
    process.env.API_LEGACY_SUNSET ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
const MAX_PROOF_BYTES = 128 * 1024;
const PROOF_REPLAY_TTL_MS = Number(process.env.PROOF_REPLAY_TTL_MS || 10 * 60 * 1000);
const proofReplayCache = new Map<string, number>();
const ALLOWED_PROOF_FORMATS = ['sd-jwt-vc', 'jwt_vp', 'ldp_vp', 'ldp_vc', 'merkle-membership'] as const;
const didPattern = /^did:[a-z0-9]+:[A-Za-z0-9._:%-]+(?:[;/:?#][^\s]*)?$/;

const proofVerificationSchema = z.object({
    format: z.enum(ALLOWED_PROOF_FORMATS),
    proof: z.union([z.string().min(1).max(MAX_PROOF_BYTES), z.record(z.unknown())]),
    challenge: z.string().trim().max(512).optional(),
    domain: z.string().trim().max(255).optional(),
    expected_issuer_did: z.string().trim().regex(didPattern, 'Invalid expected_issuer_did').optional(),
    expected_subject_did: z.string().trim().regex(didPattern, 'Invalid expected_subject_did').optional(),
    expected_claims: z.record(z.unknown()).optional(),
    revocation_witness: z
        .object({
            credential_id: z.string().trim().min(1).max(512),
            revoked: z.boolean(),
            status_list: z
                .object({
                    list_id: z.string().trim().min(1).max(512),
                    index: z.number().int().nonnegative(),
                    revoked: z.boolean(),
                    updated_at: z.string().max(128).optional(),
                })
                .nullable()
                .optional(),
            anchor_proof: z
                .object({
                    batch_id: z.string().trim().min(1).max(512),
                    root: z.string().trim().min(1).max(512),
                    proof: z.array(z.string().trim().max(1024)).max(128),
                })
                .nullable()
                .optional(),
        })
        .optional(),
    expected_hash: z.string().trim().min(1).max(256).optional(),
    hash_algorithm: z.enum(['sha256', 'keccak256']).optional(),
});

const proofMetadataSchema = z.object({
    credential: z.record(z.unknown()),
    hash_algorithm: z.enum(['sha256', 'keccak256']).optional(),
});

function requireProofAccess(req: any, res: any, next: any): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required', code: 'PROOF_AUTH_REQUIRED' });
        return;
    }

    const payload = verifyAccessToken(authHeader.substring(7));
    if (!payload) {
        res.status(401).json({ error: 'Invalid or expired token', code: 'PROOF_AUTH_INVALID' });
        return;
    }

    const role = String(payload.role || '').toLowerCase();
    if (role !== 'recruiter' && role !== 'admin' && role !== 'verifier') {
        res.status(403).json({ error: 'Insufficient permissions', code: 'PROOF_FORBIDDEN' });
        return;
    }

    req.user = payload;
    next();
}
type Oid4vpRequestState = {
    vpRequests: Array<[string, { id: string; nonce: string; createdAt: number; purpose: string; state?: string }]>;
};
const hasDatabase = typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0;
const stateStore = hasDatabase
    ? new PostgresStateStore<Oid4vpRequestState>({
        databaseUrl: process.env.DATABASE_URL as string,
        serviceKey: 'recruiter-oid4vp-requests',
    })
    : null;

let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
let persistChain = Promise.resolve();

router.use('/verify', (_req, res, next) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', LEGACY_VERIFY_SUNSET_HEADER);
    res.setHeader('Link', '</api/v1/verifications>; rel="successor-version"');
    next();
});

async function ensureHydrated(): Promise<void> {
    if (!stateStore || hydrated) return;
    if (!hydrationPromise) {
        hydrationPromise = (async () => {
            const loaded = await stateStore.load();
            vpRequests.clear();
            for (const [requestId, request] of loaded?.vpRequests || []) {
                vpRequests.set(requestId, request);
            }
            hydrated = true;
        })();
    }
    await hydrationPromise;
}

async function queuePersist(): Promise<void> {
    if (!stateStore) return;
    persistChain = persistChain
        .then(async () => {
            await stateStore.save({
                vpRequests: Array.from(vpRequests.entries()),
            });
        })
        .catch((error) => {
            console.error('[OID4VP] Persist failed:', error);
        });
    await persistChain;
}

function pruneExpiredVpRequests(): boolean {
    let changed = false;
    const now = Date.now();
    for (const [requestId, request] of vpRequests.entries()) {
        if ((request.createdAt + VP_REQUEST_TTL_MS) < now) {
            vpRequests.delete(requestId);
            changed = true;
        }
    }
    return changed;
}

function pruneProofReplayCache(): void {
    const now = Date.now();
    for (const [key, expiresAt] of proofReplayCache.entries()) {
        if (expiresAt <= now) {
            proofReplayCache.delete(key);
        }
    }
}

function markProofReplayFingerprint(fingerprint: string): boolean {
    pruneProofReplayCache();
    if (proofReplayCache.has(fingerprint)) {
        return false;
    }
    proofReplayCache.set(fingerprint, Date.now() + PROOF_REPLAY_TTL_MS);
    return true;
}

function deriveProofReplayFingerprint(input: {
    format: string;
    proof: string | Record<string, unknown>;
    challenge?: string;
    domain?: string;
}): string {
    const proofDigest =
        typeof input.proof === 'string'
            ? crypto.createHash('sha256').update(input.proof).digest('hex')
            : deterministicHash(input.proof, 'sha256');
    return `${input.format}:${input.challenge || ''}:${input.domain || ''}:${proofDigest}`;
}

function mapCredentialValidity(
    status: 'verified' | 'failed' | 'suspicious' | 'pending',
): VerificationResultContract['credential_validity'] {
    if (status === 'verified') return 'valid';
    if (status === 'failed') return 'invalid';
    return 'unknown';
}

function mapStatusValidity(riskFlags: string[]): VerificationResultContract['status_validity'] {
    if (riskFlags.includes('REVOKED_CREDENTIAL')) return 'revoked';
    return 'active';
}

function mapAnchorValidity(riskFlags: string[]): VerificationResultContract['anchor_validity'] {
    if (riskFlags.includes('NO_BLOCKCHAIN_ANCHOR')) return 'pending';
    return 'anchored';
}

function mapDecision(recommendation: string | undefined): VerificationResultContract['decision'] {
    switch (recommendation) {
        case 'accept':
            return 'approve';
        case 'reject':
            return 'reject';
        case 'review':
            return 'review';
        default:
            return 'investigate';
    }
}


function isUnsignedOrScannedCredential(credentialData: Record<string, unknown> | null): boolean {
    if (!credentialData) return false;
    const hasCryptographicProof = Boolean((credentialData as any).proof || (credentialData as any).signature);
    if (!hasCryptographicProof) return true;

    const scanHints = [
        (credentialData as any).scanned,
        (credentialData as any).scanResult,
        (credentialData as any).scanSource,
        (credentialData as any).documentScan,
        (credentialData as any).ocr,
    ];

    return scanHints.some((value) => {
        if (value === true) return true;
        if (typeof value === 'string') {
            const lowered = value.toLowerCase();
            return lowered.includes('scan') || lowered.includes('ocr');
        }
        return false;
    });
}

function applyLockedVerificationDecisionPolicy(input: {
    riskFlags: string[];
    recommendation?: string;
    credentialData: Record<string, unknown> | null;
}): VerificationResultContract['decision'] {
    if (input.riskFlags.includes('INVALID_SIGNATURE')) {
        return 'reject';
    }
    if (isUnsignedOrScannedCredential(input.credentialData)) {
        return 'review';
    }
    return mapDecision(input.recommendation);
}

function toCandidateDecision(decision: VerificationResultContract['decision']): VerificationDecision {
    return decision;
}

function buildCandidateSummaryContract(input: {
    candidateId: string;
    verificationResult: { confidence: number; riskScore: number; timestamp: Date; checks: Array<{ name: string; status: string }>; riskFlags: string[] };
    decision: VerificationResultContract['decision'];
    issuer?: string;
}): CandidateVerificationSummary {
    const confidence = Number(Math.max(0, Math.min(1, input.verificationResult.confidence)).toFixed(2));
    const risk_score = Number((Math.max(0, Math.min(100, input.verificationResult.riskScore)) / 100).toFixed(2));
    const score = Math.max(0, Math.min(1000, Math.round(confidence * 1000)));

    const breakdown: WorkScoreBreakdown[] = input.verificationResult.checks.map((check) => ({
        category: String(check.name || 'verification').toLowerCase().replace(/\s+/g, '_'),
        weight: Number((1 / Math.max(input.verificationResult.checks.length, 1)).toFixed(2)),
        score: check.status === 'passed' ? 100 : check.status === 'warning' ? 60 : 20,
        weighted_score: check.status === 'passed' ? 100 : check.status === 'warning' ? 60 : 20,
        event_count: 1,
    }));

    const evidence: VerificationEvidence[] = [
        {
            id: `verification-${input.verificationResult.timestamp.getTime()}`,
            type: 'external_check',
            issuer: input.issuer,
            metadata: {
                risk_flags: input.verificationResult.riskFlags,
            },
            verified_at: input.verificationResult.timestamp.toISOString(),
        },
    ];

    return {
        candidate_id: input.candidateId,
        decision: toCandidateDecision(input.decision),
        confidence,
        risk_score,
        reason_codes: input.verificationResult.riskFlags as ReasonCode[],
        work_score: {
            score,
            max_score: 1000,
            computed_at: input.verificationResult.timestamp.toISOString(),
            breakdown,
        },
        evidence,
    };
}

async function emitVerificationWebhook(event: string, payload: Record<string, unknown>): Promise<void> {
    const targetUrl = process.env.VERIFICATION_WEBHOOK_URL;
    if (!targetUrl) return;

    const secret = process.env.VERIFICATION_WEBHOOK_SECRET || process.env.CREDENTIAL_WEBHOOK_SECRET;
    const body = { event, ...payload };
    const signed = secret ? signWebhook(body, secret) : null;

    await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(signed
                ? {
                    'X-Webhook-Timestamp': signed.timestamp,
                    'X-Webhook-Signature': `sha256=${signed.signature}`,
                }
                : {}),
        },
        body: signed ? signed.payload : JSON.stringify(body),
    });
}

function parseJwtPayloadSafely(jwt: string): Record<string, unknown> {
    if (Buffer.byteLength(jwt, 'utf8') > MAX_JWT_BYTES) {
        throw new Error('JWT payload is too large');
    }
    const parts = jwt.split('.');
    if (parts.length < 2) {
        throw new Error('Invalid JWT format');
    }
    const decoded = Buffer.from(parts[1], 'base64url').toString();
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JWT payload');
    }
    return parsed as Record<string, unknown>;
}

function readString(value: unknown, fallback = 'Unknown'): string {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function readCredentialType(credentialData: Record<string, unknown> | null): string {
    if (!credentialData) return 'Unknown';
    const typeValue = credentialData.type;
    if (Array.isArray(typeValue)) {
        return readString(typeValue[0], 'Unknown');
    }
    return readString(typeValue, 'Unknown');
}

function readSubjectName(credentialData: Record<string, unknown> | null): string {
    if (!credentialData) return 'Unknown';
    const subjectValue = credentialData.credentialSubject;
    if (!subjectValue || typeof subjectValue !== 'object') {
        return 'Unknown';
    }
    return readString((subjectValue as Record<string, unknown>).name, 'Unknown');
}

function readIssuer(credentialData: Record<string, unknown> | null): string {
    if (!credentialData) return 'Unknown';
    const issuerValue = credentialData.issuer;
    if (typeof issuerValue === 'string') return readString(issuerValue, 'Unknown');
    if (!issuerValue || typeof issuerValue !== 'object') return 'Unknown';
    const issuerObject = issuerValue as Record<string, unknown>;
    return readString(issuerObject.name ?? issuerObject.id, 'Unknown');
}

// ============== Instant Verification ==============

/**
 * Verify a single credential (JWT, QR, or raw)
 */
router.post('/verify/instant', writeIdempotency, async (req, res) => {
    try {
        const { jwt, qrData, credential, verifiedBy = 'Anonymous Recruiter' } = req.body;

        if (!jwt && !qrData && !credential) {
            return res.status(400).json({
                error: 'Provide jwt, qrData, or credential object'
            });
        }

        // Run verification
        const verificationResult = await verificationEngine.verifyCredential({
            jwt,
            qrData,
            raw: credential,
        });

        // Run fraud analysis
        let credentialData: Record<string, unknown> | null = null;
        if (credential && typeof credential === 'object') {
            credentialData = credential as Record<string, unknown>;
        } else if (jwt) {
            try {
                credentialData = parseJwtPayloadSafely(jwt);
            } catch (decodeError: any) {
                return res.status(400).json({ error: decodeError?.message || 'Invalid JWT payload' });
            }
        }
        const fraudAnalysis = credentialData
            ? await fraudDetector.analyzeCredential(credentialData)
            : { score: 0, flags: [], recommendation: 'review', details: [] };

        // Store in history
        const record: VerificationRecord = {
            id: verificationResult.verificationId,
            credentialType: readCredentialType(credentialData),
            issuer: readString(credentialData?.issuer, 'Unknown'),
            subject: readSubjectName(credentialData),
            status: verificationResult.status,
            riskScore: verificationResult.riskScore,
            fraudScore: fraudAnalysis.score,
            recommendation: fraudAnalysis.recommendation,
            timestamp: new Date(),
            verifiedBy,
        };
        await storage.addVerification(record);

        const reasonCodes = verificationResult.riskFlags;
        const severity: 'info' | 'low' | 'medium' | 'high' =
            verificationResult.riskScore >= 75 ? 'high'
            : verificationResult.riskScore >= 45 ? 'medium'
            : verificationResult.riskScore > 0 ? 'low'
            : 'info';

        const riskSignals = reasonCodes.map((code) => ({
            id: code,
            score: verificationResult.riskScore,
            severity,
            source: 'rules' as const,
            reason_codes: [code],
        }));

        const lockedDecision = applyLockedVerificationDecisionPolicy({
            riskFlags: verificationResult.riskFlags,
            recommendation: fraudAnalysis.recommendation,
            credentialData,
        });

        const candidateSummary = buildCandidateSummaryContract({
            candidateId: readSubjectName(credentialData) || verificationResult.verificationId,
            verificationResult,
            decision: lockedDecision,
            issuer: readIssuer(credentialData),
        });

        const responseBody = {
            success: true,
            verification: verificationResult,
            fraud: fraudAnalysis,
            record,
            candidate_summary: candidateSummary,
            reason_codes: reasonCodes,
            risk_signals_version: 'risk-v1',
            risk_signals: riskSignals,
            evidence_links: [],
            v1: {
                reason_codes: reasonCodes,
                risk_signals_version: 'risk-v1',
                risk_signals: riskSignals,
                evidence_links: [],
                credential_validity: verificationResult.status === 'verified' ? 'valid' : 'invalid',
                status_validity: verificationResult.riskFlags.includes('REVOKED_CREDENTIAL') ? 'revoked' : 'active',
                anchor_validity: verificationResult.riskFlags.includes('NO_BLOCKCHAIN_ANCHOR') ? 'pending' : 'anchored',
                fraud_score: fraudAnalysis.score,
                fraud_explanations: fraudAnalysis.flags,
                decision: lockedDecision,
                decision_reason_codes: verificationResult.riskFlags,
            },
        };

        void emitVerificationWebhook('verification.completed', {
            verificationId: verificationResult.verificationId,
            status: verificationResult.status,
            credentialType: record.credentialType,
            issuer: record.issuer,
            subject: record.subject,
            riskScore: verificationResult.riskScore,
        }).catch((error) => console.error('Verification webhook error:', error));

        res.json(responseBody);
    } catch (error) {
        console.error('Instant verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

/**
 * Verify via QR scan (simplified endpoint)
 */
router.post('/verify/qr', writeIdempotency, async (req, res) => {
    try {
        const { qrData } = req.body;

        if (!qrData) {
            return res.status(400).json({ error: 'qrData is required' });
        }

        // Parse QR and extract verification token
        let parsedData;
        try {
            parsedData = JSON.parse(qrData);
        } catch {
            parsedData = JSON.parse(Buffer.from(qrData, 'base64').toString());
        }

        const verificationResult = await verificationEngine.verifyCredential({
            qrData: JSON.stringify(parsedData),
        });

        res.json({
            success: true,
            verification: verificationResult,
        });
    } catch (error) {
        console.error('QR verification error:', error);
        res.status(500).json({ error: 'QR verification failed' });
    }
});

// ============== Bulk Verification ==============

/**
 * Bulk verify credentials from array
 */
router.post('/verify/bulk', writeIdempotency, async (req, res) => {
    try {
        const { credentials } = req.body;

        if (!credentials || !Array.isArray(credentials)) {
            return res.status(400).json({ error: 'credentials array is required' });
        }

        if (credentials.length > 100) {
            return res.status(400).json({ error: 'Maximum 100 credentials per batch' });
        }

        const payloads = credentials.map(cred => ({
            jwt: cred.jwt,
            qrData: cred.qrData,
            raw: cred.credential || cred,
        }));

        const bulkResult = await verificationEngine.bulkVerify(payloads);

        res.json({
            success: true,
            result: bulkResult,
        });
    } catch (error) {
        console.error('Bulk verification error:', error);
        res.status(500).json({ error: 'Bulk verification failed' });
    }
});

/**
 * Get bulk job status
 */
router.get('/verify/bulk/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const result = await verificationEngine.getBulkJobResult(jobId);

        if (!result) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({ success: true, result });
    } catch (error) {
        console.error('Get bulk job error:', error);
        res.status(500).json({ error: 'Failed to get job status' });
    }
});


// New route: Verify credential via link URL
router.post('/verify/link', requireProofAccess, writeIdempotency, async (req, res) => {
    try {
        const { link } = req.body;
        if (!link) {
            return res.status(400).json({ error: 'Link URL is required' });
        }
        // Fetch credential from the provided URL (expects JSON)
        const response = await fetch(link);
        if (!response.ok) {
            return res.status(400).json({ error: `Failed to fetch credential from link (status ${response.status})` });
        }
        const payloadUnknown: unknown = await response.json();
        if (!payloadUnknown || typeof payloadUnknown !== 'object') {
            return res.status(400).json({ error: 'Invalid credential response payload' });
        }
        const payload = payloadUnknown as Record<string, unknown>;

        let verificationResult;
        let credentialData: Record<string, unknown> = {};

        // Handle wrapper response (from Issuer offer/consume) which often contains vcJwt or a credential object
        const payloadJwt = typeof payload.vcJwt === 'string' ? payload.vcJwt : null;
        if (payloadJwt) {
            verificationResult = await verificationEngine.verifyCredential({ jwt: payloadJwt });
            try {
                const decoded = parseJwtPayloadSafely(payloadJwt);
                const vcClaim = decoded.vc;
                if (vcClaim && typeof vcClaim === 'object') {
                    credentialData = vcClaim as Record<string, unknown>;
                } else {
                    credentialData = decoded;
                }
            } catch {
                credentialData = {};
            }
        } else if (payload.credential && typeof payload.credential === 'object') {
            verificationResult = await verificationEngine.verifyCredential({ raw: payload.credential });
            credentialData = payload.credential as Record<string, unknown>;
        } else {
            // Fallback to raw payload (if it's a direct VC)
            verificationResult = await verificationEngine.verifyCredential({ raw: payload });
            credentialData = payload;
        }

        // Run fraud analysis on the fetched credential data
        const fraudAnalysis = await fraudDetector.analyzeCredential(credentialData);
        // Store verification record
        const record: VerificationRecord = {
            id: verificationResult.verificationId,
            credentialType: readCredentialType(credentialData),
            issuer: readIssuer(credentialData),
            subject: readSubjectName(credentialData),
            status: verificationResult.status,
            riskScore: verificationResult.riskScore,
            fraudScore: fraudAnalysis.score,
            recommendation: fraudAnalysis.recommendation,
            timestamp: new Date(),
            verifiedBy: 'Link Verification',
        };
        await storage.addVerification(record);
        res.json({ success: true, verification: verificationResult, fraud: fraudAnalysis, record });
    } catch (error) {
        console.error('Link verification error:', error);
        res.status(500).json({ error: 'Link verification failed' });
    }
});

// ============== OpenID4VP + V1 Verification APIs ==============

router.post('/v1/oid4vp/requests', authMiddleware, writeIdempotency, async (req, res) => {
    await ensureHydrated();
    if (pruneExpiredVpRequests()) {
        await queuePersist();
    }

    const { purpose = 'credential_verification', state } = req.body || {};
    if (typeof purpose !== 'string' || purpose.trim().length === 0 || purpose.length > 128) {
        return res.status(400).json({ error: 'invalid purpose' });
    }
    if (state !== undefined && (typeof state !== 'string' || state.length === 0 || state.length > 512)) {
        return res.status(400).json({ error: 'invalid state' });
    }

    const requestId = `vp_req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const nonce = crypto.randomBytes(16).toString('hex');
    const createdAt = Date.now();

    vpRequests.set(requestId, {
        id: requestId,
        nonce,
        createdAt,
        purpose: purpose.trim(),
        state,
    });
    await queuePersist();

    res.status(201).json({
        request_id: requestId,
        nonce,
        state: state || null,
        expires_at: new Date(createdAt + VP_REQUEST_TTL_MS).toISOString(),
        presentation_definition: {
            id: requestId,
            input_descriptors: [
                {
                    id: 'credential',
                    format: {
                        jwt_vc_json: { alg: ['ES256', 'EdDSA'] },
                        'vc+sd-jwt': { sd_jwt_alg_values: ['ES256', 'EdDSA'] },
                    },
                },
            ],
        },
    });
});

router.post('/v1/oid4vp/responses', authMiddleware, writeIdempotency, async (req, res) => {
    try {
        await ensureHydrated();
        if (pruneExpiredVpRequests()) {
            await queuePersist();
        }

        const { request_id: requestId, vp_token: vpToken, credential, jwt, state } = req.body || {};
        if (typeof requestId !== 'string' || requestId.trim().length === 0) {
            return res.status(400).json({ error: 'request_id is required' });
        }

        const request = vpRequests.get(requestId);
        if (!request) {
            return res.status(400).json({ error: 'unknown request_id' });
        }

        if (!vpToken && !jwt && !credential) {
            return res.status(400).json({ error: 'vp_token, jwt, or credential is required' });
        }

        const bindingJwt = typeof (jwt || vpToken) === 'string' ? String(jwt || vpToken) : null;
        if (bindingJwt) {
            const payload = parseJwtPayloadSafely(bindingJwt);
            const presentedNonce = readString(payload.nonce, '');
            if (!presentedNonce || presentedNonce !== request.nonce) {
                return res.status(400).json({ error: 'nonce mismatch' });
            }

            if (request.state) {
                const presentedState =
                    (typeof state === 'string' && state) ||
                    readString(payload.state, '');
                if (!presentedState || presentedState !== request.state) {
                    return res.status(400).json({ error: 'state mismatch' });
                }
            }
        } else if (request.state && (!state || state !== request.state)) {
            return res.status(400).json({ error: 'state mismatch' });
        }

        const verificationResult = await verificationEngine.verifyCredential({
            jwt: jwt || vpToken,
            raw: credential,
        });

        vpRequests.delete(requestId);
        await queuePersist();

        res.json({
            request_id: requestId,
            status: verificationResult.status,
            verification_id: verificationResult.verificationId,
            checks: verificationResult.checks,
            risk_score: verificationResult.riskScore,
        });
    } catch (error) {
        console.error('OID4VP response processing failed:', error);
        res.status(500).json({ error: 'failed to process presentation response' });
    }
});

router.post('/v1/proofs/verify', requireProofAccess, writeIdempotency, async (req, res) => {
    try {
        const parsed = proofVerificationSchema.safeParse(req.body || {});
        if (!parsed.success) {
            return res.status(400).json({
                error: 'Invalid proof verification input',
                code: 'PROOF_INPUT_INVALID',
                details: parsed.error.flatten(),
            });
        }

        const payload = parsed.data as ProofVerificationRequestContract & {
            expected_hash?: string;
            hash_algorithm?: 'sha256' | 'keccak256';
        };
        const proof = payload.proof;

        if (payload.challenge || payload.domain) {
            const fingerprint = deriveProofReplayFingerprint({
                format: payload.format,
                proof,
                challenge: payload.challenge,
                domain: payload.domain,
            });
            if (!markProofReplayFingerprint(fingerprint)) {
                return res.status(409).json({
                    error: 'Duplicate proof replay detected',
                    code: 'PROOF_REPLAY_DETECTED',
                });
            }
        }

        const result = await verifyProofContract(payload);
        res.json(result);
    } catch (error: any) {
        if (error instanceof ProofVerificationError) {
            return res.status(error.status).json({ error: error.message, code: error.code });
        }
        console.error('Proof verification failed:', error);
        res.status(500).json({ error: 'proof verification failed', code: 'PROOF_VERIFY_INTERNAL_ERROR' });
    }
});

router.post('/v1/proofs/metadata', requireProofAccess, writeIdempotency, async (req, res) => {
    try {
        const parsed = proofMetadataSchema.safeParse(req.body || {});
        if (!parsed.success) {
            return res.status(400).json({
                error: 'credential object is required',
                code: 'PROOF_METADATA_INPUT_INVALID',
                details: parsed.error.flatten(),
            });
        }

        const credentialBytes = Buffer.byteLength(JSON.stringify(parsed.data.credential), 'utf8');
        if (credentialBytes > MAX_PROOF_BYTES) {
            return res.status(400).json({ error: 'credential payload too large', code: 'PROOF_METADATA_INPUT_INVALID' });
        }

        const algorithm = parseProofAlgorithm(parsed.data.hash_algorithm);
        const canonicalization = parseCanonicalization(req.body?.canonicalization);
        const hash = deterministicHash(parsed.data.credential, algorithm, canonicalization);
        return res.json({
            hash,
            hash_algorithm: algorithm,
            canonicalization,
            proof_version: '1.0',
            checked_at: new Date().toISOString(),
            code: 'PROOF_METADATA_READY',
        });
    } catch (error) {
        console.error('Proof metadata failed:', error);
        return res.status(500).json({ error: 'proof metadata failed', code: 'PROOF_METADATA_INTERNAL_ERROR' });
    }
});

router.post('/v1/verifications/instant', authMiddleware, writeIdempotency, async (req, res) => {
    try {
        const { jwt, qrData, credential, verifiedBy = 'Anonymous Recruiter' } = req.body || {};
        if (!jwt && !qrData && !credential) {
            return res.status(400).json({ error: 'Provide jwt, qrData, or credential object' });
        }

        const verificationResult = await verificationEngine.verifyCredential({
            jwt,
            qrData,
            raw: credential,
        });

        let credentialData: Record<string, unknown> | null = null;
        if (credential && typeof credential === 'object') {
            credentialData = credential as Record<string, unknown>;
        } else if (typeof jwt === 'string') {
            try {
                credentialData = parseJwtPayloadSafely(jwt);
            } catch (decodeError: any) {
                return res.status(400).json({ error: decodeError?.message || 'Invalid JWT payload' });
            }
        }

        const fraudAnalysis = credentialData
            ? await fraudDetector.analyzeCredential(credentialData)
            : { score: 0, flags: [], recommendation: 'review', details: [] };

        const record: VerificationRecord = {
            id: verificationResult.verificationId,
            credentialType: readCredentialType(credentialData),
            issuer: readIssuer(credentialData),
            subject: readSubjectName(credentialData),
            status: verificationResult.status,
            riskScore: verificationResult.riskScore,
            fraudScore: fraudAnalysis.score,
            recommendation: fraudAnalysis.recommendation,
            timestamp: new Date(),
            verifiedBy,
        };
        await storage.addVerification(record);

        const lockedDecision = applyLockedVerificationDecisionPolicy({
            riskFlags: verificationResult.riskFlags,
            recommendation: fraudAnalysis.recommendation,
            credentialData,
        });

        const contractResult: VerificationResultContract = {
            id: verificationResult.verificationId,
            credential_validity: mapCredentialValidity(verificationResult.status),
            status_validity: mapStatusValidity(verificationResult.riskFlags),
            anchor_validity: mapAnchorValidity(verificationResult.riskFlags),
            fraud_score: fraudAnalysis.score,
            fraud_explanations: fraudAnalysis.flags,
            decision: lockedDecision,
            decision_reason_codes: verificationResult.riskFlags,
        };

        const candidateSummary = buildCandidateSummaryContract({
            candidateId: readSubjectName(credentialData) || verificationResult.verificationId,
            verificationResult,
            decision: lockedDecision,
            issuer: readIssuer(credentialData),
        });

        res.json({
            ...contractResult,
            candidate_summary: candidateSummary,
            verification_id: contractResult.id,
            checks: verificationResult.checks,
        });
    } catch (error) {
        console.error('V1 instant verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

router.post('/v1/verifications/bulk', authMiddleware, writeIdempotency, async (req, res) => {
    try {
        const { credentials } = req.body || {};
        if (!credentials || !Array.isArray(credentials)) {
            return res.status(400).json({ error: 'credentials array is required' });
        }
        if (credentials.length > 1000) {
            return res.status(400).json({ error: 'Maximum 1000 credentials per batch' });
        }

        const payloads = credentials.map((cred: Record<string, unknown>) => ({
            jwt: typeof cred.jwt === 'string' ? cred.jwt : undefined,
            qrData: typeof cred.qrData === 'string' ? cred.qrData : undefined,
            raw: (cred.credential ?? cred),
        }));
        const bulkResult = await verificationEngine.bulkVerify(payloads);

        res.json({
            id: bulkResult.id,
            total: bulkResult.total,
            verified: bulkResult.verified,
            failed: bulkResult.failed,
            suspicious: bulkResult.suspicious,
            completed_at: bulkResult.completedAt,
        });
    } catch (error) {
        console.error('V1 bulk verification error:', error);
        res.status(500).json({ error: 'Bulk verification failed' });
    }
});

router.get('/v1/verifications', authMiddleware, async (req, res) => {
    try {
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const startDateRaw = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
        const endDateRaw = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
        const limitRaw = Number.parseInt(String(req.query.limit ?? '50'), 10);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

        const startDate = startDateRaw ? new Date(startDateRaw) : undefined;
        const endDate = endDateRaw ? new Date(endDateRaw) : undefined;

        if (startDate && Number.isNaN(startDate.getTime())) {
            return res.status(400).json({ error: 'Invalid startDate query parameter' });
        }
        if (endDate && Number.isNaN(endDate.getTime())) {
            return res.status(400).json({ error: 'Invalid endDate query parameter' });
        }

        const records = await storage.getVerifications({ status, startDate, endDate });
        const items = records.slice(0, limit).map((verification) => ({
            id: verification.id,
            status: verification.status,
            credential_type: verification.credentialType,
            issuer: verification.issuer,
            subject: verification.subject,
            risk_score: verification.riskScore,
            fraud_score: verification.fraudScore,
            recommendation: verification.recommendation,
            timestamp: verification.timestamp,
        }));

        res.json({
            total: records.length,
            items,
        });
    } catch (error) {
        console.error('V1 verification list error:', error);
        res.status(500).json({ error: 'Failed to list verifications' });
    }
});

router.get('/v1/verifications/:id', authMiddleware, async (req, res) => {
    const id = req.params.id;
    const verification = await storage.getVerification(id);
    if (!verification) {
        return res.status(404).json({ error: 'Verification not found' });
    }
    const contractResult: VerificationResultContract = {
        id: verification.id,
        credential_validity: verification.status === 'verified' ? 'valid' : verification.status === 'failed' ? 'invalid' : 'unknown',
        status_validity: 'unknown',
        anchor_validity: 'unknown',
        fraud_score: verification.fraudScore,
        fraud_explanations: [],
        decision: mapDecision(verification.recommendation),
        decision_reason_codes: [],
    };

    res.json({
        ...contractResult,
        id: verification.id,
        status: verification.status,
        credential_type: verification.credentialType,
        issuer: verification.issuer,
        subject: verification.subject,
        risk_score: verification.riskScore,
        fraud_score: verification.fraudScore,
        recommendation: verification.recommendation,
        timestamp: verification.timestamp,
    });
});

export default router;
