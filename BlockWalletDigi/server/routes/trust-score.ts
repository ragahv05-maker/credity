/**
 * Trust Score API Routes
 * Provides endpoints for trust score calculation and improvement suggestions
 */

import { Router, Request, Response } from 'express';
import { and, count, eq, gte, lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
    calculateTrustScore,
    generateImprovementSuggestions,
    getScoreHistory,
    UserTrustData,
    ImprovementSuggestion
} from '../services/trust-score-service';
import * as livenessService from '../services/liveness-service';
import * as biometricsService from '../services/biometrics-service';
import * as documentService from '../services/document-scanner-service';
import { activities, platformConnections, reputationEvents } from '@shared/schema';

const router = Router();

const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : null;
const db = pool ? drizzle(pool) : null;

/**
 * GET /api/trust-score
 * Get the current trust score with full breakdown
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.query.userId as string) || 1;

        // Build user trust data from various sources
        // In production, this would aggregate from database
        const userData = await getUserTrustData(userId);
        const breakdown = calculateTrustScore(userData);
        const suggestions = generateImprovementSuggestions(userData, breakdown);
        const history = getScoreHistory(userId);

        res.json({
            success: true,
            score: breakdown.totalScore,
            level: breakdown.level,
            levelLabel: breakdown.levelLabel,
            breakdown: {
                identity: {
                    ...breakdown.identity,
                    percentage: 40,
                    maxPoints: 40
                },
                activity: {
                    ...breakdown.activity,
                    percentage: 30,
                    maxPoints: 30
                },
                reputation: {
                    ...breakdown.reputation,
                    percentage: 30,
                    maxPoints: 30
                }
            },
            suggestions: suggestions.slice(0, 5), // Top 5 suggestions
            history: history.slice(-7), // Last 7 days
            lastUpdated: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Trust score error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate trust score'
        });
    }
});

/**
 * GET /api/trust-score/breakdown
 * Get detailed breakdown of trust score components
 */
router.get('/breakdown', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.query.userId as string) || 1;
        const userData = await getUserTrustData(userId);
        const breakdown = calculateTrustScore(userData);

        res.json({
            success: true,
            breakdown,
            rawData: {
                documentsVerified: userData.documentVerified,
                livenessCompleted: userData.livenessVerified,
                biometricsEnabled: userData.biometricsSetup,
                digilockerConnected: userData.digilockerConnected,
                totalCredentials: userData.totalCredentials,
                totalVerifications: userData.totalVerifications,
                platformConnections: userData.platformConnectionCount,
                lastActivity: userData.lastActivityDate
            }
        });
    } catch (error: any) {
        console.error('Trust score breakdown error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get score breakdown'
        });
    }
});

/**
 * GET /api/trust-score/suggestions
 * Get all improvement suggestions
 */
router.get('/suggestions', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.query.userId as string) || 1;
        const userData = await getUserTrustData(userId);
        const breakdown = calculateTrustScore(userData);
        const suggestions = generateImprovementSuggestions(userData, breakdown);

        const quickWins = suggestions.filter((s: ImprovementSuggestion) => s.category === 'quick_win');
        const longTerm = suggestions.filter((s: ImprovementSuggestion) => s.category === 'long_term');

        res.json({
            success: true,
            quickWins,
            longTerm,
            potentialPoints: suggestions.reduce((sum: number, s: ImprovementSuggestion) => sum + s.points, 0)
        });
    } catch (error: any) {
        console.error('Trust score suggestions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get suggestions'
        });
    }
});

/**
 * GET /api/trust-score/history
 * Get historical trust score data
 */
router.get('/history', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.query.userId as string) || 1;
        const days = parseInt(req.query.days as string) || 30;
        const history = getScoreHistory(userId);

        res.json({
            success: true,
            history: history.slice(-days),
            trend: calculateTrend(history)
        });
    } catch (error: any) {
        console.error('Trust score history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get score history'
        });
    }
});

/**
 * Calculate score trend (up, down, stable)
 */
function calculateTrend(history: { date: string; score: number }[]): string {
    if (history.length < 7) return 'stable';

    const recent = history.slice(-7);
    const older = history.slice(-14, -7);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + h.score, 0) / older.length;

    const diff = recentAvg - olderAvg;

    if (diff > 3) return 'up';
    if (diff < -3) return 'down';
    return 'stable';
}

/**
 * Build user trust data from storage/database
 */
async function getUserTrustData(userId: number): Promise<UserTrustData> {
    // Fetch real status from services
    const livenessStatus = livenessService.getUserLivenessStatus(userId.toString());
    const biometricsStatus = biometricsService.getBiometricStatus(userId.toString());
    const documentStatus = documentService.getDocumentVerificationStatus(userId.toString());

    let totalVerifications = 0;
    let platformConnectionCount = 0;
    let endorsementCount = 0;
    let positiveFeedbackCount = 0;
    let negativeFeedbackCount = 0;

    if (db) {
        // Count share/verification activities for this user
        const [activityRow] = await db
            .select({ value: count() })
            .from(activities)
            .where(eq(activities.userId, userId));
        totalVerifications = Number(activityRow?.value ?? 0);

        // Count active platform connections for this user
        const [connRow] = await db
            .select({ value: count() })
            .from(platformConnections)
            .where(and(eq(platformConnections.userId, userId), eq(platformConnections.status, 'active')));
        platformConnectionCount = Number(connRow?.value ?? 0);

        // Count reputation event signals
        const [endRow] = await db
            .select({ value: count() })
            .from(reputationEvents)
            .where(and(eq(reputationEvents.userId, userId), gte(reputationEvents.score, 75)));
        endorsementCount = Number(endRow?.value ?? 0);

        const [posRow] = await db
            .select({ value: count() })
            .from(reputationEvents)
            .where(and(eq(reputationEvents.userId, userId), gte(reputationEvents.score, 50)));
        positiveFeedbackCount = Number(posRow?.value ?? 0);

        const [negRow] = await db
            .select({ value: count() })
            .from(reputationEvents)
            .where(and(eq(reputationEvents.userId, userId), lt(reputationEvents.score, 50)));
        negativeFeedbackCount = Number(negRow?.value ?? 0);
    }

    return {
        userId,
        // Identity (Real Data)
        livenessVerified: livenessStatus.verified,
        documentVerified: documentStatus.verified,
        biometricsSetup: biometricsStatus.enrolled,
        digilockerConnected: documentStatus.documentCount > 0,

        // Activity (DB queries)
        totalCredentials: documentStatus.documentCount + 3,
        totalVerifications,
        platformConnectionCount,
        lastActivityDate: new Date(),

        // Reputation (DB queries)
        suspiciousActivityFlags: 0,
        endorsementCount,
        positiveFeedbackCount,
        negativeFeedbackCount,
    };
}

export default router;
