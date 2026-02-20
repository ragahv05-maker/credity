import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import * as livenessService from '../services/liveness-service';
import * as documentService from '../services/document-scanner-service';
import {
    calculateReputationScore,
    calculateSafeDateScore,
    deriveSafeDateInputs,
    listReputationEvents,
    ReputationCategory,
    ReputationEventInput,
    ReputationEventRecord,
    upsertReputationEvent,
} from '../services/reputation-rail-service';
import { CredVerse, type CandidateVerificationSummary, type VerificationEvidence, type ReputationScoreContract, type SafeDateScoreContract } from '@credverse/trust';
import { type ReasonCode } from '@credverse/shared-auth'; // ReasonCode not yet exported by trust-sdk

const router = Router();

const ALLOWED_CATEGORIES: ReputationCategory[] = [
    'transport',
    'accommodation',
    'delivery',
    'employment',
    'finance',
    'social',
    'identity',
];

function parseUserId(rawValue: unknown): number {
    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error('userId must be a positive integer');
    }
    return parsed;
}

function getAllowedPlatforms(): Set<string> {
    const raw = process.env.REPUTATION_PLATFORM_ALLOWLIST || '';
    return new Set(
        raw
            .split(',')
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean),
    );
}

function normalizeReasonCode(code: string): ReasonCode {
    return code.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_') as ReasonCode;
}

function isTrustSdkEnabled(): boolean {
    return String(process.env.REPUTATION_TRUST_SDK_ENABLED || '').toLowerCase() === 'true';
}

function createTrustSdkClient(): CredVerse | null {
    const baseUrl = process.env.TRUST_SDK_BASE_URL;
    if (!isTrustSdkEnabled() || !baseUrl) return null;

    const timeoutMs = Number(process.env.TRUST_SDK_TIMEOUT_MS || 10_000);
    return new CredVerse({
        baseUrl,
        apiKey: process.env.TRUST_SDK_API_KEY,
        timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10_000,
    });
}

function normalizeBreakdownWeight(weight: number): number {
    return weight > 1 ? weight / 100 : weight;
}

function mapVerificationDecision(score: number, safeDateScore: number, reasonCodes: string[]): CandidateVerificationSummary['decision'] {
    const normalized = reasonCodes.map(normalizeReasonCode);
    if (normalized.includes('HARASSMENT_REPORTS_PRESENT') || normalized.includes('BACKGROUND_FLAGS_PRESENT')) {
        return 'investigate';
    }
    if (score >= 800 && safeDateScore >= 70) return 'approve';
    if (score < 500 || safeDateScore < 45) return 'reject';
    return 'review';
}

function buildVerificationEvidence(events: ReputationEventRecord[]): VerificationEvidence[] {
    return events.slice(0, 10).map((event) => ({
        id: event.event_id,
        type: 'reputation_event',
        uri: `credverse://reputation/events/${event.id}`,
        verified_at: event.occurred_at,
        metadata: {
            category: event.category,
            signal_type: event.signal_type,
            platform_id: event.platform_id,
            score: event.score,
        },
    }));
}

async function buildCandidateVerificationSummary(userId: number): Promise<CandidateVerificationSummary> {
    const { reputationScore, safeDate } = await buildSafeDateSnapshot(userId);
    const recentEvents = await listReputationEvents(userId);

    const confidence = Math.max(0.5, Math.min(0.99, Number((reputationScore.score / 1000).toFixed(2))));
    const riskScore = Number((1 - confidence).toFixed(2));

    const normalizedReasonCodes = safeDate.reason_codes.map(normalizeReasonCode);
    const reasonCodes: ReasonCode[] =
        normalizedReasonCodes.length > 0
            ? normalizedReasonCodes
            : ['MANUAL_REVIEW_REQUIRED'];

    return {
        candidate_id: `candidate_wallet_user_${userId}`,
        decision: mapVerificationDecision(reputationScore.score, safeDate.score, safeDate.reason_codes),
        confidence,
        risk_score: riskScore,
        reason_codes: reasonCodes,
        work_score: {
            score: reputationScore.score,
            max_score: 1000,
            computed_at: reputationScore.computed_at,
            breakdown: reputationScore.category_breakdown.map((entry) => ({
                ...entry,
                weight: normalizeBreakdownWeight(entry.weight),
            })),
        },
        evidence: buildVerificationEvidence(recentEvents),
    };
}

async function buildSafeDateSnapshot(userId: number): Promise<{ reputationScore: ReputationScoreContract; safeDate: SafeDateScoreContract }> {
    const trustSdk = createTrustSdkClient();
    if (trustSdk) {
        try {
            const [reputationScore, safeDate] = await Promise.all([
                trustSdk.getReputationScore({ userId }),
                trustSdk.getSafeDateScore({ userId }),
            ]);
            return { reputationScore, safeDate };
        } catch (error) {
            console.warn('[reputation] Trust SDK fetch failed, using local fallback:', (error as Error)?.message || error);
        }
    }

    const reputationScore = await calculateReputationScore(userId);
    const user = await storage.getUser(userId);
    const liveness = livenessService.getUserLivenessStatus(String(userId));
    const documentStatus = documentService.getDocumentVerificationStatus(String(userId));
    const dynamicInputs = await deriveSafeDateInputs(userId);

    const safeDate = calculateSafeDateScore(userId, reputationScore, {
        identityVerified: Boolean(user?.did) || documentStatus.verified,
        livenessVerified: liveness.verified,
        ...dynamicInputs,
    });

    return {
        reputationScore,
        safeDate,
    };
}

/**
 * GET /api/reputation/events
 * List reputation events for a user.
 */
router.get('/events', async (req: Request, res: Response) => {
    try {
        const userId = parseUserId(req.query.userId || 1);
        const categoryRaw = req.query.category ? String(req.query.category) : undefined;
        const category =
            categoryRaw && ALLOWED_CATEGORIES.includes(categoryRaw as ReputationCategory)
                ? (categoryRaw as ReputationCategory)
                : undefined;
        const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 100));

        const events = (await listReputationEvents(userId, category)).slice(0, limit);
        return res.json({
            success: true,
            events,
            count: events.length,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            error: error?.message || 'Failed to list reputation events',
        });
    }
});

/**
 * POST /api/reputation/events
 * Ingest a platform-signed reputation event.
 */
router.post('/events', async (req: Request, res: Response) => {
    try {
        const requiredApiKey = process.env.REPUTATION_WRITE_API_KEY;
        if (requiredApiKey) {
            const suppliedApiKey = String(req.header('x-api-key') || req.header('X-API-Key') || '');
            if (!suppliedApiKey || suppliedApiKey !== requiredApiKey) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid platform write API key',
                });
            }
        }

        const body = req.body as ReputationEventInput;
        const platformId = String(body?.platform_id || '').trim().toLowerCase();
        const allowedPlatforms = getAllowedPlatforms();
        if (allowedPlatforms.size > 0 && !allowedPlatforms.has(platformId)) {
            return res.status(403).json({
                success: false,
                error: 'Platform is not allowlisted for reputation writes',
            });
        }

        const result = await upsertReputationEvent({
            ...body,
            platform_id: platformId,
        });

        const { reputationScore, safeDate } = await buildSafeDateSnapshot(result.event.user_id);
        const statusCode = result.duplicate ? 200 : 201;

        return res.status(statusCode).json({
            success: true,
            duplicate: result.duplicate,
            event: result.event,
            reputation: reputationScore,
            safe_date: safeDate,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            error: error?.message || 'Failed to ingest reputation event',
        });
    }
});

/**
 * GET /api/reputation/score
 * Calculate and return the user reputation rail score.
 */
router.get('/score', async (req: Request, res: Response) => {
    try {
        const userId = parseUserId(req.query.userId || 1);
        const { reputationScore } = await buildSafeDateSnapshot(userId);

        return res.json({
            success: true,
            reputation: reputationScore,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            error: error?.message || 'Failed to calculate reputation score',
        });
    }
});

/**
 * GET /api/reputation/safedate
 * Calculate and return SafeDate score from trust + behavior signals.
 */
router.get('/safedate', async (req: Request, res: Response) => {
    try {
        const userId = parseUserId(req.query.userId || 1);
        const { safeDate } = await buildSafeDateSnapshot(userId);

        return res.json({
            success: true,
            safe_date: safeDate,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            error: error?.message || 'Failed to calculate SafeDate score',
        });
    }
});

/**
 * GET /api/reputation/summary
 * Return full CandidateVerificationSummary contract from backend.
 */
router.get('/summary', async (req: Request, res: Response) => {
    try {
        const userId = parseUserId(req.query.userId || 1);
        const candidateSummary = await buildCandidateVerificationSummary(userId);

        return res.json({
            success: true,
            candidate_summary: candidateSummary,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            error: error?.message || 'Failed to calculate candidate verification summary',
        });
    }
});

export default router;
