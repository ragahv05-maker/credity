/**
 * Liveness Detection Service
 * Implements basic liveness verification with challenge-response
 */

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

/**
 * Complete a challenge
 */
export function completeChallenge(sessionId: string, challengeId: string): {
    success: boolean;
    nextChallenge: LivenessChallenge | null;
    sessionComplete: boolean;
} {
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
        session.result = {
            success: true,
            sessionId: session.id,
            challenges: session.challenges,
            completedChallenges: session.challenges.length,
            totalChallenges: session.challenges.length,
            score: 95,
            faceDetected: true,
            spoofingDetected: false,
            timestamp: new Date()
        };

        // Update user liveness status
        userLivenessStatus.set(session.userId, {
            verified: true,
            lastVerification: new Date(),
            score: 95
        });

        return { success: true, nextChallenge: null, sessionComplete: true };
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
 * Verify face matches stored embedding (simulated)
 */
export function verifyFaceMatch(currentEmbedding: string, storedEmbedding: string): { match: boolean; confidence: number } {
    const similarity = 0.85 + Math.random() * 0.15;
    return {
        match: similarity > 0.8,
        confidence: similarity
    };
}

/**
 * Check for spoofing (simulated)
 */
export function detectSpoofing(frameData: string): { isSpoofed: boolean; confidence: number } {
    return {
        isSpoofed: Math.random() < 0.02,
        confidence: 0.95
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
 * Generate mock face embedding
 */
export function generateFaceEmbedding(frameData: string): string {
    return `embedding_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}
