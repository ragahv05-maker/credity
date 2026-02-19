import { Router } from 'express';
import { verificationEngine } from '../services/verification-engine';
import { fraudDetector } from '../services/fraud-detector';
import { authMiddleware, verifyAccessToken } from '../services/auth-service';
import { storage, VerificationRecord } from '../storage';
import { idempotencyMiddleware } from '@credverse/shared-auth';
import type {
    ProofVerificationRequestContract,
    VerificationResultContract,
} from '@credverse/shared-auth';
import { deterministicHash, parseCanonicalization, parseProofAlgorithm } from '../services/proof-lifecycle';
import { verifyProofContract, ProofVerificationError } from '../services/proof-verifier-service';
import { z } from 'zod';
import { oid4vpService } from '../services/oid4vp-service';
import { proofReplayService } from '../services/proof-replay-service';
import {
    mapCredentialValidity,
    mapStatusValidity,
    mapAnchorValidity,
    mapDecision,
    applyLockedVerificationDecisionPolicy,
    buildCandidateSummaryContract,
    emitVerificationWebhook,
    parseJwtPayloadSafely,
    readCredentialType,
    readIssuer,
    readSubjectName,
    readString
} from '../services/verification-utils';

const router = Router();
const writeIdempotency = idempotencyMiddleware({ ttlMs: 6 * 60 * 60 * 1000 });
const MAX_PROOF_BYTES = 128 * 1024;
const LEGACY_VERIFY_SUNSET_HEADER =
    process.env.API_LEGACY_SUNSET ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
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

router.use('/verify', (_req, res, next) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', LEGACY_VERIFY_SUNSET_HEADER);
    res.setHeader('Link', '</api/v1/verifications>; rel="successor-version"');
    next();
});

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
    const { purpose = 'credential_verification', state } = req.body || {};
    if (typeof purpose !== 'string' || purpose.trim().length === 0 || purpose.length > 128) {
        return res.status(400).json({ error: 'invalid purpose' });
    }
    if (state !== undefined && (typeof state !== 'string' || state.length === 0 || state.length > 512)) {
        return res.status(400).json({ error: 'invalid state' });
    }

    const request = await oid4vpService.createRequest(purpose, state);

    res.status(201).json({
        request_id: request.id,
        nonce: request.nonce,
        state: request.state || null,
        expires_at: new Date(request.createdAt + oid4vpService.getTtlMs()).toISOString(),
        presentation_definition: {
            id: request.id,
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
        const { request_id: requestId, vp_token: vpToken, credential, jwt, state } = req.body || {};
        if (typeof requestId !== 'string' || requestId.trim().length === 0) {
            return res.status(400).json({ error: 'request_id is required' });
        }

        const request = await oid4vpService.getRequest(requestId);
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

        await oid4vpService.deleteRequest(requestId);

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
            const fingerprint = proofReplayService.deriveProofReplayFingerprint({
                format: payload.format,
                proof,
                challenge: payload.challenge,
                domain: payload.domain,
            });
            if (!proofReplayService.markProofReplayFingerprint(fingerprint)) {
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
