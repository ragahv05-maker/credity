/**
 * Liveness Detection Service
 * Implements basic liveness verification with challenge-response
 */

import { getAIAdapter } from './ai-adapter';

export interface LivenessChallenge {
    id: string;
    type: 'blink' | 'turn_left' | 'turn_right' | 'smile' | 'nod';
    instruction: string;
    timeoutMs: number;
    completed: boolean;
}

export interface LivenessResult {
    success: boolean;
    sessionId: string;
    challenges: LivenessChallenge[];
    completedChallenges: number;
    totalChallenges: number;
    score: number;
    faceDetected: boolean;
    spoofingDetected: boolean;
    faceEmbedding?: string;
    timestamp: Date;
}

export interface LivenessSession {
    id: string;
    userId: string;
    challenges: LivenessChallenge[];
    currentChallengeIndex: number;
    startedAt: Date;
    expiresAt: Date;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';
    result?: LivenessResult;
}

// Store active sessions
const activeSessions = new Map<string, LivenessSession>();
const userLivenessStatus = new Map<string, { verified: boolean; lastVerification: Date; score: number }>();

/**
 * Start a new liveness verification session
 */
export function startLivenessSession(userId: string): LivenessSession {
    const sessionId = `liveness_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const allChallenges: LivenessChallenge[] = [
        { id: 'c1', type: 'blink', instruction: 'Blink your eyes twice', timeoutMs: 5000, completed: false },
        { id: 'c2', type: 'turn_left', instruction: 'Slowly turn your head left', timeoutMs: 5000, completed: false },
        { id: 'c3', type: 'turn_right', instruction: 'Slowly turn your head right', timeoutMs: 5000, completed: false },
        { id: 'c4', type: 'smile', instruction: 'Smile for the camera', timeoutMs: 5000, completed: false },
        { id: 'c5', type: 'nod', instruction: 'Nod your head up and down', timeoutMs: 5000, completed: false },
    ];

    // Shuffle and pick 3 challenges
    const shuffled = allChallenges.sort(() => Math.random() - 0.5);
    const selectedChallenges = shuffled.slice(0, 3);

    const session: LivenessSession = {
        id: sessionId,
        userId,
        challenges: selectedChallenges,
        currentChallengeIndex: 0,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        status: 'pending'
    };

    activeSessions.set(sessionId, session);
    return session;
}

/**
 * Get current challenge for a session
 */
export function getCurrentChallenge(sessionId: string): LivenessChallenge | null {
    const session = activeSessions.get(sessionId);
    if (!session || session.status === 'completed' || session.status === 'failed') {
        return null;
    }

    if (session.currentChallengeIndex >= session.challenges.length) {
        return null;
    }

    return session.challenges[session.currentChallengeIndex];
}

// --- Real liveness scoring (Task 2.3) ---

/**
 * Calculate liveness score based on challenge completion metrics.
 * Replaces the hardcoded score: 95.
 */
function calculateLivenessScore(
    completedChallenges: number,
    totalChallenges: number,
    sessionStartedAt: Date,
): number {
    const secondsTaken = (Date.now() - sessionStartedAt.getTime()) / 1000;

    // baseScore = (completedChallenges / totalChallenges) * 70   // max 70 points
    const baseScore = (completedChallenges / totalChallenges) * 70;

    // timeBonus = max(0, 10 - secondsTaken) * 1.0               // up to 10 bonus points
    const timeBonus = Math.max(0, 10 - secondsTaken) * 1.0;

    // freshnessBonus = 20                                        // constant for now
    const freshnessBonus = 20;

    // finalScore = clamp(baseScore + timeBonus + freshnessBonus, 0, 100)
    const finalScore = Math.min(100, Math.max(0, baseScore + timeBonus + freshnessBonus));

    return Math.round(finalScore);
}

/**
 * Complete a challenge.
 * @param frameBase64 Optional base64-encoded image frame from the final challenge step.
 *   When provided, it is forwarded to the AI adapter for spoof detection.
 */
export async function completeChallenge(sessionId: string, challengeId: string, frameBase64?: string): Promise<{
    success: boolean;
    nextChallenge: LivenessChallenge | null;
    sessionComplete: boolean;
}> {
    const session = activeSessions.get(sessionId);
    if (!session) {
        return { success: false, nextChallenge: null, sessionComplete: false };
    }

    const challengeIndex = session.challenges.findIndex(c => c.id === challengeId);
    if (challengeIndex === -1 || challengeIndex !== session.currentChallengeIndex) {
        return { success: false, nextChallenge: null, sessionComplete: false };
    }

    session.challenges[challengeIndex].completed = true;
    session.currentChallengeIndex++;
    session.status = 'in_progress';

    if (session.currentChallengeIndex >= session.challenges.length) {
        session.status = 'completed';

        const completedCount = session.challenges.filter(c => c.completed).length;
        const totalCount = session.challenges.length;
        const score = calculateLivenessScore(completedCount, totalCount, session.startedAt);

        // Run AI-based spoof detection using the configured adapter.
        // Falls back to DeterministicFallbackAdapter when no API key is set.
        const frame = frameBase64 ?? '';
        const aiResult = await getAIAdapter().analyzeLiveness(frame);
        const spoofingDetected = aiResult.spoofingDetected;
        const faceDetected = aiResult.faceDetected;

        // Derive a stable face embedding identifier from the frame (non-ML, used for record-keeping).
        // Replace with actual FaceNet embedding extraction when a model sidecar is available.
        const faceEmbedding: string | undefined = frame.length > 0
            ? require('crypto').createHash('sha256').update(frame.slice(0, 512)).digest('hex')
            : undefined;

        session.result = {
            success: !spoofingDetected,
            sessionId: session.id,
            challenges: session.challenges,
            completedChallenges: completedCount,
            totalChallenges: totalCount,
            score: spoofingDetected ? Math.min(score, 30) : score,
            faceDetected,
            spoofingDetected,
            faceEmbedding,
            timestamp: new Date()
        };

        // Update user liveness status
        userLivenessStatus.set(session.userId, {
            verified: !spoofingDetected,
            lastVerification: new Date(),
            score: session.result.score
        });

        return { success: !spoofingDetected, nextChallenge: null, sessionComplete: true };
    }

    return {
        success: true,
        nextChallenge: session.challenges[session.currentChallengeIndex],
        sessionComplete: false
    };
}

/**
 * Get session result
 */
export function getSessionResult(sessionId: string): LivenessResult | null {
    const session = activeSessions.get(sessionId);
    return session?.result || null;
}

/**
 * Verify face matches stored embedding
 * Returns deterministic low-confidence result when ML model is not configured.
 */
export function verifyFaceMatch(currentEmbedding: string, storedEmbedding: string): { match: boolean; confidence: number } {
    // TODO: Replace with actual cosine similarity of 128-d FaceNet embeddings
    // For now, return a deterministic match with moderate confidence
    // since we cannot compute real embeddings without the ML sidecar
    console.info('[Liveness] Face match using placeholder — ML model not configured');
    return {
        match: currentEmbedding === storedEmbedding,
        confidence: currentEmbedding === storedEmbedding ? 0.85 : 0.2,
    };
}

/**
 * Check for spoofing
 * Returns deterministic safe result when ML model is not configured.
 */
export function detectSpoofing(frameData: string): { isSpoofed: boolean; confidence: number } {
    // TODO: Replace with PyTorch FaceNet model call via Python FastAPI sidecar
    console.info('[Liveness] Spoof detection skipped — ML model not configured');
    return {
        isSpoofed: false,
        confidence: 0.5, // Low confidence since no real detection is happening
    };
}

/**
 * Get liveness status for user
 */
export function getUserLivenessStatus(userId: string): { verified: boolean; lastVerification: Date | null; score: number } {
    const status = userLivenessStatus.get(userId);
    if (status) {
        return { ...status, lastVerification: status.lastVerification };
    }
    return { verified: false, lastVerification: null, score: 0 };
}

/**
 * Generate face embedding from frame data.
 * Returns null when ML model is not configured.
 */
export function generateFaceEmbedding(frameData: string): string | null {
    // TODO: Extract 128-d FaceNet embedding from frame via Python FastAPI sidecar
    console.info('[Liveness] Face embedding generation skipped — ML model not configured');
    return null;
}
