/**
 * Identity Verification Routes
 * Implements PRD v3.1 Layer 1: Identity Verification API
 * 
 * Endpoints:
 * - POST /api/identity/liveness/start - Start liveness session
 * - POST /api/identity/liveness/challenge - Complete a challenge
 * - GET /api/identity/liveness/:sessionId - Get session result
 * - POST /api/identity/biometrics/enroll - Enroll biometrics
 * - POST /api/identity/biometrics/verify - Verify biometrics
 * - POST /api/identity/document/scan - Scan document
 * - GET /api/identity/status - Get overall verification status
 */

import { Router, Request, Response } from 'express';
import * as livenessService from '../services/liveness-service';
import * as biometricsService from '../services/biometrics-service';
import * as documentService from '../services/document-scanner-service';
import { aiService } from '../services/ai-service';
import { validateDocumentByType } from '../services/document-type-validator-service';
import { matchFace } from '../services/face-match-service';

const router = Router();

// ==================== LIVENESS ====================

/**
 * POST /api/identity/liveness/start
 * Start a new liveness verification session
 */
router.post('/liveness/start', async (req: Request, res: Response) => {
    try {
        const userId = req.body.userId || '1';

        const session = livenessService.startLivenessSession(userId);

        res.json({
            success: true,
            sessionId: session.id,
            challenges: session.challenges.map(c => ({
                id: c.id,
                type: c.type,
                instruction: c.instruction,
                timeoutMs: c.timeoutMs
            })),
            currentChallenge: session.challenges[0],
            expiresAt: session.expiresAt
        });
    } catch (error: any) {
        console.error('Liveness start error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/identity/liveness/challenge
 * Complete a liveness challenge
 */
router.post('/liveness/challenge', async (req: Request, res: Response) => {
    try {
        const { sessionId, challengeId, frameData } = req.body;

        if (!sessionId || !challengeId) {
            return res.status(400).json({
                success: false,
                error: 'sessionId and challengeId are required'
            });
        }

        // Check for spoofing if frame data provided
        if (frameData) {
            const spoofCheck = livenessService.detectSpoofing(frameData);
            if (spoofCheck.isSpoofed) {
                return res.status(400).json({
                    success: false,
                    error: 'Spoofing detected'
                });
            }
        }

        // completeChallenge now accepts an optional frame for AI spoof detection
        const result = await livenessService.completeChallenge(sessionId, challengeId, frameData);

        res.json({
            success: result.success,
            nextChallenge: result.nextChallenge,
            sessionComplete: result.sessionComplete,
            result: result.sessionComplete ? livenessService.getSessionResult(sessionId) : null
        });
    } catch (error: any) {
        console.error('Liveness challenge error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/identity/liveness/complete
 * Complete liveness verification (called after camera-based detection)
 */
router.post('/liveness/complete', async (req: Request, res: Response) => {
    try {
        const { userId, passed, frameData } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        let isVerified = passed;
        let aiDetails = null;

        // If frame data is provided, use AI to verify liveness
        if (frameData) {
            console.log('Analyzing liveness frame with AI...');
            const analysis = await aiService.analyzeLivenessFrame(frameData);

            aiDetails = analysis;

            if (!analysis.isReal || analysis.spoofingDetected || !analysis.faceDetected) {
                console.log('AI Liveness Check Failed:', analysis);
                isVerified = false;
            } else {
                console.log('AI Liveness Check Passed:', analysis);
                isVerified = true;
            }
        }

        if (isVerified) {
            // Create a completed session for the user
            const session = livenessService.startLivenessSession(userId);

            // Mark all challenges as complete
            for (const challenge of session.challenges) {
                await livenessService.completeChallenge(session.id, challenge.id);
            }

            const result = livenessService.getSessionResult(session.id);

            // Add AI analysis to result if available
            if (result && aiDetails) {
                (result as any).aiAnalysis = aiDetails;
            }

            res.json({
                success: true,
                verified: true,
                result,
                aiAnalysis: aiDetails
            });
        } else {
            res.json({
                success: false,
                verified: false,
                error: 'Liveness check failed',
                details: aiDetails ? aiDetails.details : 'Verification failed'
            });
        }
    } catch (error: any) {
        console.error('Liveness complete error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/identity/liveness/:sessionId
 * Get liveness session result
 */
router.get('/liveness/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const result = livenessService.getSessionResult(sessionId);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Session not found or incomplete'
            });
        }

        res.json({
            success: true,
            result
        });
    } catch (error: any) {
        console.error('Get liveness result error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== BIOMETRICS ====================

/**
 * GET /api/identity/biometrics/status
 * Check biometric availability and enrollment
 */
router.get('/biometrics/status', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string || '1';

        const availability = biometricsService.checkBiometricAvailability();
        const enrollment = biometricsService.getBiometricEnrollment(userId);

        res.json({
            success: true,
            available: availability.available,
            types: availability.types,
            enrolled: enrollment !== null,
            enrollment: enrollment ? {
                type: enrollment.type,
                enrolledAt: enrollment.enrolledAt,
                status: enrollment.status
            } : null
        });
    } catch (error: any) {
        console.error('Biometrics status error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/identity/biometrics/enroll
 * Enroll user biometrics
 */
router.post('/biometrics/enroll', async (req: Request, res: Response) => {
    try {
        const { userId, type, deviceId } = req.body;

        if (!userId || !type) {
            return res.status(400).json({
                success: false,
                error: 'userId and type are required'
            });
        }

        const enrollment = biometricsService.enrollBiometrics(
            userId,
            type,
            deviceId || 'web-browser'
        );

        res.json({
            success: true,
            enrollment: {
                id: enrollment.id,
                type: enrollment.type,
                enrolledAt: enrollment.enrolledAt,
                status: enrollment.status
            }
        });
    } catch (error: any) {
        console.error('Biometrics enroll error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/identity/biometrics/verify
 * Request biometric verification
 */
router.post('/biometrics/verify', async (req: Request, res: Response) => {
    try {
        const { userId, action, deviceId, success: verifySuccess, method } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        // If this is a verification response
        if (verifySuccess !== undefined) {
            const result = biometricsService.verifyBiometricResponse(
                req.body.challengeId,
                userId,
                verifySuccess,
                method || 'face_id'
            );

            return res.json({
                success: true,
                verified: result.success,
                result
            });
        }

        // Start verification request
        const request = biometricsService.requestBiometricVerification({
            userId,
            action: action || 'credential_share',
            deviceId: deviceId || 'web-browser'
        });

        res.json({
            success: true,
            challengeId: request.challengeId,
            promptRequired: request.promptRequired,
            fallbackAvailable: request.fallbackAvailable
        });
    } catch (error: any) {
        console.error('Biometrics verify error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== DOCUMENT SCANNING ====================

/**
 * POST /api/identity/document/scan
 * Scan and extract data from document
 */
router.post('/document/scan', async (req: Request, res: Response) => {
    try {
        const { userId, imageData, documentType } = req.body;

        if (!userId || !imageData) {
            return res.status(400).json({
                success: false,
                error: 'userId and imageData are required'
            });
        }

        // Use AI to extract data and verify authenticity
        const aiAnalysis = await aiService.analyzeDocument(imageData, documentType || 'identity_card');

        let extractedData = {};

        // Merge AI extracted data with standard service
        if (aiAnalysis.isValid) {
            extractedData = aiAnalysis.extractedData;
        }

        const result = await documentService.scanDocument({
            userId,
            imageData,
            documentType: documentType || 'auto'
        });

        // Enhance result with AI analysis
        const enhancedResult = {
            ...result,
            extractedData: { ...result.extractedData, ...extractedData },
            overallScore: Math.round((result.overallScore + (aiAnalysis.isValid ? (1 - aiAnalysis.fraudScore) * 100 : 0)) / 2),
            warnings: [...(result.warnings || []), ...(aiAnalysis.fraudScore > 0.5 ? ['Potential forgery detected by AI'] : [])]
        };

        res.json({
            success: result.success,
            documentId: result.documentId,
            documentType: result.documentType,
            extractedData: result.extractedData,
            faceExtracted: result.faceExtracted,
            overallScore: result.overallScore,
            warnings: result.warnings,
            processingTimeMs: result.processingTimeMs
        });
    } catch (error: any) {
        console.error('Document scan error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/identity/documents
 * Get all scanned documents for user
 */
router.get('/documents', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string || '1';

        const documents = documentService.getUserDocuments(userId);

        res.json({
            success: true,
            documents: documents.map(d => ({
                id: d.id,
                type: d.type,
                verified: d.verified,
                scannedAt: d.scannedAt,
                extractedData: d.result.extractedData
            }))
        });
    } catch (error: any) {
        console.error('Get documents error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/document/validate-type', async (req: Request, res: Response) => {
    try {
        const { type, documentNumber } = req.body;
        const result = validateDocumentByType(type, documentNumber);

        if (!result.valid) {
            return res.status(400).json({ success: false, ...result });
        }

        res.json({ success: true, ...result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/face-match', async (req: Request, res: Response) => {
    try {
        const {
            idFaceEmbedding,
            liveFaceEmbedding,
            idImageData,
            liveImageData,
            threshold,
        } = req.body;

        const result = matchFace({
            idFaceEmbedding,
            liveFaceEmbedding,
            idImageData,
            liveImageData,
            threshold,
        });

        res.json({
            success: true,
            confidence: result.confidence,
            threshold: result.threshold,
            matched: result.matched,
        });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ==================== OVERALL STATUS ====================

/**
 * GET /api/identity/status
 * Get complete identity verification status
 */
router.get('/status', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string || '1';

        const livenessStatus = livenessService.getUserLivenessStatus(userId);
        const biometricsStatus = biometricsService.getBiometricStatus(userId);
        const documentStatus = documentService.getDocumentVerificationStatus(userId);

        // Calculate overall score
        let score = 0;
        if (livenessStatus.verified) score += 35;
        if (biometricsStatus.enrolled) score += 25;
        if (documentStatus.verified) score += 40;

        const verificationLevel =
            score >= 80 ? 'full' :
                score >= 50 ? 'partial' :
                    score > 0 ? 'basic' : 'none';

        res.json({
            success: true,
            userId,
            score,
            verificationLevel,
            liveness: {
                verified: livenessStatus.verified,
                lastVerification: livenessStatus.lastVerification,
                score: livenessStatus.score
            },
            biometrics: {
                enrolled: biometricsStatus.enrolled,
                type: biometricsStatus.type,
                lastVerified: biometricsStatus.lastVerified
            },
            documents: {
                verified: documentStatus.verified,
                count: documentStatus.documentCount,
                types: documentStatus.types
            }
        });
    } catch (error: any) {
        console.error('Get identity status error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
