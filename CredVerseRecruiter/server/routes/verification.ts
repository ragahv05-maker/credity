import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { verificationEngine } from '../services/verification-engine';
import { fraudDetector } from '../services/fraud-detector';
import { authMiddleware, writeIdempotency } from '../services/auth-service';
import {
    VerificationResultContract,
    VerificationRecord,
    parseJwtPayloadSafely,
    readCredentialType,
    readIssuer,
    readSubjectName,
    deriveDecision,
    mapDecisionToLegacyRecommendation,
    mapCredentialValidity,
    mapStatusValidity,
    mapAnchorValidity,
    mapDecision,
} from '@credverse/shared-auth';
import crypto from 'crypto';

const router = Router();

// Idempotency and State Management
let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
const vpRequests = new Map<string, { id: string; nonce: string; createdAt: number; purpose: string; state?: string }>();

async function ensureHydrated() {
    if (hydrated) return;
    if (hydrationPromise) return hydrationPromise;
    hydrationPromise = (async () => {
        const persisted = await storage.getIdempotencyKeys(); // Reusing this table for simple state dump if needed
        // For now, in-memory is fine for MVP/demo
        hydrated = true;
    })();
    await hydrationPromise;
}

async function queuePersist() {
    // No-op for MVP in-memory state
}

function pruneExpiredVpRequests(): boolean {
    const now = Date.now();
    let changed = false;
    for (const [id, req] of vpRequests) {
        if (now - req.createdAt > 10 * 60 * 1000) { // 10 min TTL
            vpRequests.delete(id);
            changed = true;
        }
    }
    return changed;
}

// ============== Legacy Link Verification ==============

router.post('/verify/link', authMiddleware, async (req, res) => {
    try {
        const { link } = req.body;
        if (!link) return res.status(400).json({ error: 'Link required' });

        // Simulate link resolution
        const verificationResult = await verificationEngine.verifyCredential({
            raw: { id: 'linked-cred', type: ['VerifiableCredential'], issuer: 'https://issuer.example' }
        });

        const fraudAnalysis = await fraudDetector.analyzeCredential({});

        const record: VerificationRecord = {
            id: verificationResult.verificationId,
            credentialType: ['VerifiableCredential'],
            issuer: 'https://issuer.example',
            subject: 'Unknown Subject',
            status: verificationResult.status,
            riskScore: verificationResult.riskScore,
            fraudScore: fraudAnalysis.score,
            recommendation: 'approve',
            timestamp: new Date(),
            verifiedBy: 'Link Verifier',
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
    const requestId = `vp_req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const nonce = crypto.randomBytes(16).toString('hex');

    vpRequests.set(requestId, {
        id: requestId,
        nonce,
        createdAt: Date.now(),
        purpose,
        state,
    });
    await queuePersist();

    res.status(201).json({
        request_id: requestId,
        nonce,
        state: state || null,
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

        if (!requestId) {
            return res.status(400).json({ error: 'request_id is required' });
        }

        const request = vpRequests.get(requestId);
        if (!request) {
            return res.status(400).json({ error: 'unknown request_id' });
        }

        // Validate state binding if present in request
        if (request.state && state !== request.state) {
             return res.status(400).json({ error: 'state mismatch' });
        }

        const rawToken = jwt || vpToken;
        let tokenPayload: any = {};

        if (rawToken) {
            try {
                tokenPayload = parseJwtPayloadSafely(rawToken);
                // Validate nonce binding
                if (tokenPayload.nonce && tokenPayload.nonce !== request.nonce) {
                    return res.status(400).json({ error: 'nonce mismatch' });
                }
            } catch (e) {
                // Invalid token format
            }
        }

        if (requestId && request) {
            vpRequests.delete(requestId);
            await queuePersist();
        }

        const verificationResult = await verificationEngine.verifyCredential({
            jwt: rawToken,
            raw: credential,
        });

        res.json({
            request_id: requestId || null,
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

        const derivedDecision = deriveDecision(
            verificationResult.status,
            verificationResult.riskFlags,
            fraudAnalysis.recommendation,
            verificationResult.riskScore,
        );
        const recommendation = mapDecisionToLegacyRecommendation(derivedDecision);

        const record: VerificationRecord = {
            id: verificationResult.verificationId,
            credentialType: readCredentialType(credentialData),
            issuer: readIssuer(credentialData),
            subject: readSubjectName(credentialData),
            status: verificationResult.status,
            riskScore: verificationResult.riskScore,
            fraudScore: fraudAnalysis.score,
            recommendation,
            timestamp: new Date(),
            verifiedBy,
        };
        await storage.addVerification(record);

        const contractResult: VerificationResultContract = {
            id: verificationResult.verificationId,
            credential_validity: mapCredentialValidity(verificationResult.status),
            status_validity: mapStatusValidity(verificationResult.riskFlags),
            anchor_validity: mapAnchorValidity(verificationResult.riskFlags),
            fraud_score: fraudAnalysis.score,
            fraud_explanations: fraudAnalysis.flags,
            decision: derivedDecision,
            decision_reason_codes: verificationResult.riskFlags,
        };

        res.json({
            ...contractResult,
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
