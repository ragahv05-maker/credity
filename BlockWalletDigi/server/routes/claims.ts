/**
 * Claims API Routes
 * Implements PRD v3.1 Feature 2: Claims Verification System
 * 
 * Endpoints:
 * - POST /api/v1/claims/verify - Submit claim for verification
 * - GET /api/v1/claims/:id - Get claim status
 * - POST /api/v1/evidence/upload - Upload evidence file
 * - GET /api/v1/evidence/:id/analysis - Get evidence analysis
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { verifyClaim, ClaimVerifyRequest } from '../services/claims-service';
import { claimsPersistence } from '../services/claims-persistence';
import { analyzeEvidence, EvidenceUploadRequest } from '../services/evidence-analysis';
import { buildEvidenceLinkage } from '../services/evidence-linkage';

const router = Router();

const claimVerifySchema = z.object({
    user_id: z.string().optional(),
    userId: z.string().optional(),
    claim_type: z.enum(['insurance_auto', 'refund_request', 'age_verification', 'identity_check']).optional(),
    claimType: z.enum(['insurance_auto', 'refund_request', 'age_verification', 'identity_check']).optional(),
    claim_amount: z.number().nonnegative().optional(),
    claimAmount: z.number().nonnegative().optional(),
    description: z.string().max(4000).default(''),
    timeline: z.array(z.object({ timestamp: z.string(), event: z.string() })).default([]),
    evidence: z.array(z.object({ type: z.string(), url: z.string().url(), uploadedAt: z.string(), description: z.string().optional() })).default([]),
    user_credentials: z.array(z.object({ type: z.string(), issuer: z.string().optional() })).optional(),
    userCredentials: z.array(z.object({ type: z.string(), issuer: z.string().optional() })).optional(),
});

const evidenceUploadSchema = z.object({
    user_id: z.string().min(1),
    claim_id: z.string().optional(),
    media_type: z.enum(['image', 'video', 'document']).optional(),
    url: z.string().url(),
    metadata: z.record(z.any()).optional(),
});

/**
 * POST /api/v1/claims/verify
 * Submit a claim for verification
 * 
 * Per PRD v3.1: Process claim through 3-layer verification and return Trust Score
 */
router.post('/verify', async (req: Request, res: Response) => {
    try {
        const parsed = claimVerifySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: 'validation_error',
                details: parsed.error.flatten(),
            });
        }

        const body = parsed.data;
        const userId = body.user_id || body.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'validation_error',
                details: { user_id: ['user_id is required'] },
            });
        }

        const request: ClaimVerifyRequest = {
            userId,
            claimType: body.claim_type || body.claimType || 'identity_check',
            claimAmount: body.claim_amount ?? body.claimAmount,
            description: body.description,
            timeline: body.timeline.map((item) => ({
                event: item.event,
                time: item.timestamp,
                location: 'unknown',
            })),
            evidence: body.evidence.map((item) => ({
                type: (item.type === 'video' || item.type === 'document') ? item.type : 'image',
                url: item.url,
                uploadedAt: item.uploadedAt,
            })),
            userCredentials: (body.user_credentials || body.userCredentials || []).map((credential) => credential.type),
        };

        // Process the claim through 3-layer verification
        const result = await verifyClaim(request);


        const evidenceLinks = request.evidence.map((item) =>
            buildEvidenceLinkage({
                url: item.url,
                mediaType: item.type,
                uploadedAt: item.uploadedAt,
            })
        );

        // Persist as plain objects to satisfy storage typing contracts
        const evidenceLinksRecords = evidenceLinks.map((link) => ({ ...link }));

        const nowIso = new Date().toISOString();
        await claimsPersistence.saveClaim({
            id: result.claimId,
            claimantUserId: request.userId,
            platformId: null,
            claimType: request.claimType,
            claimAmount: request.claimAmount ?? null,
            description: request.description,
            timeline: request.timeline,
            evidenceIds: [],
            evidenceLinks: evidenceLinksRecords,
            identityScore: result.breakdown.identityScore,
            integrityScore: result.breakdown.integrityScore,
            authenticityScore: result.breakdown.authenticityScore,
            trustScore: result.trustScore,
            recommendation: result.recommendation,
            redFlags: result.redFlags,
            reasonCodes: result.reasonCodes,
            riskSignals: result.riskSignals,
            aiAnalysis: result.aiAnalysis,
            processingTimeMs: result.processingTimeMs,
            createdAt: nowIso,
            processedAt: nowIso,
        });

        // Return PRD v3.1 format response (extended with audit-grade reason codes + risk signals)
        res.json({
            success: true,
            claim_id: result.claimId,
            trust_score: result.trustScore,
            recommendation: result.recommendation,
            reason_codes: result.reasonCodes,
            risk_signals_version: 'risk-v1',
            risk_signals: result.riskSignals,
            evidence_links: evidenceLinks,
            breakdown: {
                identity_score: result.breakdown.identityScore,
                integrity_score: result.breakdown.integrityScore,
                authenticity_score: result.breakdown.authenticityScore
            },
            red_flags: result.redFlags,
            ai_analysis: {
                deepfake_detected: result.aiAnalysis.deepfakeDetected,
                timeline_consistent: result.aiAnalysis.timelineConsistent,
                fraud_pattern_match: result.aiAnalysis.fraudPatternMatch,
                llm_confidence: result.aiAnalysis.llmConfidence
            },
            processing_time_seconds: result.processingTimeMs / 1000,
            cost_breakdown: {
                identity_verification: result.costBreakdown.identityVerification,
                ml_inference: result.costBreakdown.mlInference,
                llm_analysis: result.costBreakdown.llmAnalysis,
                deepfake_check: result.costBreakdown.deepfakeCheck,
                blockchain_timestamp: result.costBreakdown.blockchainTimestamp,
                total_inr: result.costBreakdown.totalInr
            }
        });
    } catch (error: any) {
        console.error('Claims verification error:', error);
        res.status(500).json({
            success: false,
            error: 'claims_verification_failed',
            message: error?.message || 'unknown_error'
        });
    }
});

/**
 * GET /api/v1/claims/user/:userId
 * List all claims filed by a specific user (holder-facing view)
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const claims = await claimsPersistence.listClaimsForUser(userId);

        res.json({
            success: true,
            claims: claims.map(c => ({
                id: c.id,
                claim_type: c.claimType,
                trust_score: c.trustScore,
                recommendation: c.recommendation,
                status: c.status ?? null,
                reviewed_at: c.reviewedAt ?? null,
                created_at: c.createdAt,
                processed_at: c.processedAt,
            })),
            total: claims.length,
        });
    } catch (error: any) {
        console.error('List user claims error:', error);
        res.status(500).json({ success: false, error: 'Failed to list claims' });
    }
});

/**
 * GET /api/v1/claims/:id
 * Get claim verification status
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const claim = await claimsPersistence.getClaim(id);

        if (!claim) {
            return res.status(404).json({
                success: false,
                error: 'Claim not found'
            });
        }

        res.json({
            success: true,
            claim: {
                id: claim.id,
                trust_score: claim.trustScore,
                recommendation: claim.recommendation,
                breakdown: {
                    identity_score: claim.identityScore,
                    integrity_score: claim.integrityScore,
                    authenticity_score: claim.authenticityScore
                },
                red_flags: claim.redFlags,
                reason_codes: claim.reasonCodes ?? [],
                risk_signals_version: 'risk-v1',
                risk_signals: claim.riskSignals ?? [],
                evidence_links: (claim as any).evidenceLinks ?? [],
                created_at: claim.createdAt,
                status: 'processed'
            }
        });
    } catch (error: any) {
        console.error('Get claim error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get claim'
        });
    }
});

/**
 * PATCH /api/v1/claims/:id/status
 * Update a claim's review status (admin/reviewer override of AI recommendation)
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const statusSchema = z.object({
            status: z.enum(['approved', 'rejected', 'needs_review']),
            reviewed_by: z.string().optional(),
            review_note: z.string().max(2000).optional(),
        });

        const parsed = statusSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: 'validation_error',
                details: parsed.error.flatten(),
            });
        }

        const updated = await claimsPersistence.updateClaimStatus(
            id,
            parsed.data.status,
            parsed.data.reviewed_by,
            parsed.data.review_note,
        );

        if (!updated) {
            return res.status(404).json({ success: false, error: 'Claim not found' });
        }

        res.json({
            success: true,
            claim: {
                id: updated.id,
                status: updated.status,
                reviewed_by: updated.reviewedBy ?? null,
                review_note: updated.reviewNote ?? null,
                reviewed_at: updated.reviewedAt,
            },
        });
    } catch (error: any) {
        console.error('Update claim status error:', error);
        res.status(500).json({ success: false, error: 'Failed to update claim status' });
    }
});

/**
 * GET /api/v1/claims
 * List all claims for a platform (paginated)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const platformId = req.query.platform_id as string;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        // Get all claims (filter by platform if specified)
        const claims = await claimsPersistence.listClaims(platformId);

        // Paginate
        const paginated = claims.slice(offset, offset + limit);

        // Calculate stats
        const stats = {
            total: claims.length,
            approved: claims.filter(c => c.recommendation === 'approve').length,
            review: claims.filter(c => c.recommendation === 'review').length,
            investigate: claims.filter(c => c.recommendation === 'investigate').length,
            rejected: claims.filter(c => c.recommendation === 'reject').length,
            avgTrustScore: claims.length > 0
                ? Math.round(claims.reduce((sum, c) => sum + c.trustScore, 0) / claims.length)
                : 0
        };

        res.json({
            success: true,
            claims: paginated.map(c => ({
                id: c.id,
                trust_score: c.trustScore,
                recommendation: c.recommendation,
                claim_type: c.claimType,
                created_at: c.createdAt
            })),
            stats,
            pagination: {
                total: claims.length,
                limit,
                offset,
                hasMore: offset + limit < claims.length
            }
        });
    } catch (error: any) {
        console.error('List claims error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list claims'
        });
    }
});

/**
 * POST /api/v1/evidence/upload
 * Upload evidence for a claim
 */
router.post('/evidence/upload', async (req: Request, res: Response) => {
    try {
        const parsed = evidenceUploadSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: 'validation_error',
                details: parsed.error.flatten(),
            });
        }

        const { user_id, claim_id, media_type, url, metadata } = parsed.data;

        const evidenceId = `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Analyze evidence
        const analysisRequest: EvidenceUploadRequest = {
            userId: user_id,
            claimId: claim_id,
            mediaType: media_type || 'image',
            url,
            metadata: metadata || {}
        };

        const analysis = await analyzeEvidence(analysisRequest);

        const nowIso = new Date().toISOString();
        await claimsPersistence.saveEvidence({
            id: evidenceId,
            userId: user_id,
            claimId: claim_id ?? null,
            mediaType: analysisRequest.mediaType,
            storageUrl: analysisRequest.url,
            authenticityScore: analysis.authenticityScore,
            isAiGenerated: analysis.isAiGenerated,
            manipulationDetected: analysis.manipulationDetected,
            metadata: analysisRequest.metadata ?? {},
            blockchainHash: analysis.blockchainHash,
            proofMetadataHash: analysis.proofMetadataHash,
            revocationCheck: { status: 'not_applicable' },
            anchorTx: { status: analysis.anchor.status, chain: analysis.anchor.chain, txHash: analysis.anchor.txHash },
            analysisData: analysis as unknown as Record<string, unknown>,
            uploadedAt: nowIso,
            analyzedAt: nowIso,
        });

        res.json({
            success: true,
            evidence_id: evidenceId,
            authenticity_score: analysis.authenticityScore,
            is_ai_generated: analysis.isAiGenerated,
            manipulation_detected: analysis.manipulationDetected,
            blockchain_hash: analysis.blockchainHash,
            proof_metadata_hash: analysis.proofMetadataHash,
            revocation_check: { status: 'not_applicable' },
            anchor: {
                status: analysis.anchor.status,
                chain: analysis.anchor.chain,
                tx_hash: analysis.anchor.txHash,
            },
            metadata_extracted: analysis.metadataExtracted
        });
    } catch (error: any) {
        console.error('Evidence upload error:', error);
        res.status(500).json({
            success: false,
            error: 'evidence_upload_failed',
            message: error?.message || 'unknown_error'
        });
    }
});

/**
 * GET /api/v1/evidence/:id/analysis
 * Get evidence analysis details
 */
router.get('/evidence/:id/analysis', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const evidence = await claimsPersistence.getEvidence(id);

        if (!evidence) {
            return res.status(404).json({
                success: false,
                error: 'Evidence not found'
            });
        }

        res.json({
            success: true,
            evidence: {
                id: evidence.id,
                media_type: evidence.mediaType,
                url: evidence.storageUrl,
                uploaded_at: evidence.uploadedAt
            },
            analysis: evidence.analysisData
        });
    } catch (error: any) {
        console.error('Get evidence analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get evidence analysis'
        });
    }
});

export default router;
