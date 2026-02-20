import crypto from 'crypto';
import { getAIAdapter } from './ai-adapter';
import { inferLivenessAndEmbedding } from './model-sidecar-service';

export interface LivenessChallenge {
    id: string;
    type: 'blink' | 'turn_left' | 'turn_right' | 'smile' | 'nod';
    instruction: string;
    timeoutMs: number;
    completed: boolean;
}

export interface CameraChallengeEvidence {
    timestamp: number;
    frameData: string;
    faceDetected: boolean;
    spoofRisk: number; // 0..1
    motionScore: number; // 0..1
    blinkCount?: number;
    yawDelta?: number;
    pitchDelta?: number;
    smileScore?: number;
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
    faceEmbeddingVector?: number[];
    timestamp: Date;
    failureReason?: string;
}

export interface LivenessSession {
    id: string;
    userId: string;
    challenges: LivenessChallenge[];
    currentChallengeIndex: number;
    startedAt: Date;
    expiresAt: Date;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';
    evidence: CameraChallengeEvidence[];
    result?: LivenessResult;
}

export class LivenessValidationError extends Error {
    constructor(public readonly code: string, message: string, public readonly statusCode = 400) {
        super(message);
        this.name = 'LivenessValidationError';
    }
}

const activeSessions = new Map<string, LivenessSession>();
const userLivenessStatus = new Map<string, { verified: boolean; lastVerification: Date; score: number }>();

export function startLivenessSession(userId: string): LivenessSession {
    if (!userId || typeof userId !== 'string') {
        throw new LivenessValidationError('invalid_user_id', 'userId is required');
    }

    const sessionId = `liveness_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const allChallenges: LivenessChallenge[] = [
        { id: 'c1', type: 'blink', instruction: 'Blink your eyes twice', timeoutMs: 6000, completed: false },
        { id: 'c2', type: 'turn_left', instruction: 'Slowly turn your head left', timeoutMs: 6000, completed: false },
        { id: 'c3', type: 'turn_right', instruction: 'Slowly turn your head right', timeoutMs: 6000, completed: false },
        { id: 'c4', type: 'smile', instruction: 'Smile for the camera', timeoutMs: 6000, completed: false },
        { id: 'c5', type: 'nod', instruction: 'Nod your head up and down', timeoutMs: 6000, completed: false },
    ];

    const selectedChallenges = [...allChallenges].sort(() => Math.random() - 0.5).slice(0, 3);

    const session: LivenessSession = {
        id: sessionId,
        userId,
        challenges: selectedChallenges,
        currentChallengeIndex: 0,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        status: 'pending',
        evidence: [],
    };

    activeSessions.set(sessionId, session);
    return session;
}

export function getCurrentChallenge(sessionId: string): LivenessChallenge | null {
    const session = activeSessions.get(sessionId);
    if (!session || session.status === 'completed' || session.status === 'failed' || session.status === 'expired') {
        return null;
    }
    if (Date.now() > session.expiresAt.getTime()) {
        session.status = 'expired';
        return null;
    }
    return session.challenges[session.currentChallengeIndex] ?? null;
}

function calculateLivenessScore(completedChallenges: number, totalChallenges: number, sessionStartedAt: Date, evidence: CameraChallengeEvidence[]): number {
    const secondsTaken = (Date.now() - sessionStartedAt.getTime()) / 1000;
    const baseScore = (completedChallenges / totalChallenges) * 70;
    const timeBonus = Math.max(0, 15 - secondsTaken) * 0.6;
    const avgMotion = evidence.length ? evidence.reduce((s, e) => s + e.motionScore, 0) / evidence.length : 0;
    const avgSpoofRisk = evidence.length ? evidence.reduce((s, e) => s + e.spoofRisk, 0) / evidence.length : 1;
    const signalBonus = Math.max(0, Math.min(15, avgMotion * 15));
    const spoofPenalty = Math.min(35, avgSpoofRisk * 40);
    return Math.round(Math.max(0, Math.min(100, baseScore + timeBonus + signalBonus - spoofPenalty)));
}

function assertEvidence(evidence: CameraChallengeEvidence): void {
    if (!evidence || typeof evidence !== 'object') {
        throw new LivenessValidationError('invalid_evidence', 'camera evidence is required');
    }
    if (!evidence.frameData || evidence.frameData.length < 32) {
        throw new LivenessValidationError('invalid_frame', 'frameData must be a valid base64 image payload');
    }
    if (!Number.isFinite(evidence.timestamp) || evidence.timestamp <= 0) {
        throw new LivenessValidationError('invalid_timestamp', 'timestamp must be unix milliseconds');
    }
    if (!Number.isFinite(evidence.spoofRisk) || evidence.spoofRisk < 0 || evidence.spoofRisk > 1) {
        throw new LivenessValidationError('invalid_spoof_risk', 'spoofRisk must be between 0 and 1');
    }
    if (!Number.isFinite(evidence.motionScore) || evidence.motionScore < 0 || evidence.motionScore > 1) {
        throw new LivenessValidationError('invalid_motion_score', 'motionScore must be between 0 and 1');
    }
    if (!evidence.faceDetected) {
        throw new LivenessValidationError('face_not_detected', 'No face detected in camera evidence');
    }
}

function validateChallengeSignal(challenge: LivenessChallenge, evidence: CameraChallengeEvidence): { valid: boolean; reason?: string } {
    if (evidence.spoofRisk >= 0.6) return { valid: false, reason: 'high_spoof_risk' };
    if (evidence.motionScore < 0.12) return { valid: false, reason: 'insufficient_motion' };

    switch (challenge.type) {
        case 'blink':
            return evidence.blinkCount && evidence.blinkCount >= 1
                ? { valid: true }
                : { valid: false, reason: 'blink_not_detected' };
        case 'turn_left':
            return (evidence.yawDelta ?? 0) <= -10
                ? { valid: true }
                : { valid: false, reason: 'left_turn_not_detected' };
        case 'turn_right':
            return (evidence.yawDelta ?? 0) >= 10
                ? { valid: true }
                : { valid: false, reason: 'right_turn_not_detected' };
        case 'smile':
            return (evidence.smileScore ?? 0) >= 0.45
                ? { valid: true }
                : { valid: false, reason: 'smile_not_detected' };
        case 'nod':
            return Math.abs(evidence.pitchDelta ?? 0) >= 8
                ? { valid: true }
                : { valid: false, reason: 'nod_not_detected' };
        default:
            return { valid: false, reason: 'unknown_challenge' };
    }
}

export async function completeChallenge(
    sessionId: string,
    challengeId: string,
    frameBase64?: string,
    cameraEvidence?: Omit<CameraChallengeEvidence, 'frameData'>
): Promise<{ success: boolean; nextChallenge: LivenessChallenge | null; sessionComplete: boolean }> {
    const session = activeSessions.get(sessionId);
    if (!session) {
        throw new LivenessValidationError('session_not_found', 'liveness session not found', 404);
    }
    if (Date.now() > session.expiresAt.getTime()) {
        session.status = 'expired';
        throw new LivenessValidationError('session_expired', 'liveness session expired', 410);
    }

    const challengeIndex = session.challenges.findIndex(c => c.id === challengeId);
    if (challengeIndex === -1 || challengeIndex !== session.currentChallengeIndex) {
        throw new LivenessValidationError('challenge_out_of_order', 'challenge is invalid or out of order');
    }

    const challenge = session.challenges[challengeIndex];
    const mergedEvidence: CameraChallengeEvidence = {
        timestamp: cameraEvidence?.timestamp ?? Date.now(),
        frameData: frameBase64 ?? '',
        faceDetected: cameraEvidence?.faceDetected ?? false,
        spoofRisk: cameraEvidence?.spoofRisk ?? 1,
        motionScore: cameraEvidence?.motionScore ?? 0,
        blinkCount: cameraEvidence?.blinkCount,
        yawDelta: cameraEvidence?.yawDelta,
        pitchDelta: cameraEvidence?.pitchDelta,
        smileScore: cameraEvidence?.smileScore,
    };

    assertEvidence(mergedEvidence);
    const challengeValidation = validateChallengeSignal(challenge, mergedEvidence);
    if (!challengeValidation.valid) {
        session.status = 'failed';
        session.result = {
            success: false,
            sessionId: session.id,
            challenges: session.challenges,
            completedChallenges: session.challenges.filter(c => c.completed).length,
            totalChallenges: session.challenges.length,
            score: 0,
            faceDetected: mergedEvidence.faceDetected,
            spoofingDetected: mergedEvidence.spoofRisk >= 0.6,
            timestamp: new Date(),
            failureReason: challengeValidation.reason,
        };
        throw new LivenessValidationError('challenge_validation_failed', challengeValidation.reason ?? 'challenge failed');
    }

    challenge.completed = true;
    session.evidence.push(mergedEvidence);
    session.currentChallengeIndex++;
    session.status = 'in_progress';

    if (session.currentChallengeIndex >= session.challenges.length) {
        session.status = 'completed';

        const completedCount = session.challenges.filter(c => c.completed).length;

        let aiResult: { spoofingDetected: boolean; faceDetected: boolean } = {
            spoofingDetected: false,
            faceDetected: true,
        };
        try {
            const inference = await getAIAdapter().analyzeLiveness(mergedEvidence.frameData);
            aiResult = {
                spoofingDetected: inference.spoofingDetected,
                faceDetected: inference.faceDetected,
            };
        } catch {
            // Provider can be unavailable in strict mode; sidecar inference remains the source of truth.
        }

        const sidecarInference = await inferLivenessAndEmbedding({
            frameData: mergedEvidence.frameData,
            challengeType: challenge.type,
            cameraEvidence: mergedEvidence,
            sessionId: session.id,
            userId: session.userId,
        });

        const spoofingDetected = aiResult.spoofingDetected || sidecarInference.spoofingDetected || mergedEvidence.spoofRisk >= 0.6;
        const faceDetected = aiResult.faceDetected && sidecarInference.faceDetected && mergedEvidence.faceDetected;
        const score = calculateLivenessScore(completedCount, session.challenges.length, session.startedAt, session.evidence);

        const embedding = sidecarInference.embedding ?? [];
        const faceEmbedding = embedding.length
            ? crypto.createHash('sha256').update(JSON.stringify(embedding)).digest('hex')
            : undefined;

        session.result = {
            success: !spoofingDetected && faceDetected,
            sessionId: session.id,
            challenges: session.challenges,
            completedChallenges: completedCount,
            totalChallenges: session.challenges.length,
            score: spoofingDetected ? Math.min(score, 30) : score,
            faceDetected,
            spoofingDetected,
            faceEmbedding,
            faceEmbeddingVector: embedding.length ? embedding : undefined,
            timestamp: new Date(),
            failureReason: spoofingDetected ? 'spoof_detected' : (!faceDetected ? 'face_not_detected' : undefined),
        };

        userLivenessStatus.set(session.userId, {
            verified: !!session.result.success,
            lastVerification: new Date(),
            score: session.result.score,
        });

        return { success: !!session.result.success, nextChallenge: null, sessionComplete: true };
    }

    return { success: true, nextChallenge: session.challenges[session.currentChallengeIndex], sessionComplete: false };
}

export function getSessionResult(sessionId: string): LivenessResult | null {
    return activeSessions.get(sessionId)?.result || null;
}

export function verifyFaceMatch(currentEmbedding: string, storedEmbedding: string): { match: boolean; confidence: number } {
    if (!currentEmbedding || !storedEmbedding) {
        throw new LivenessValidationError('invalid_embedding', 'both embeddings are required');
    }
    const match = currentEmbedding === storedEmbedding;
    return { match, confidence: match ? 0.92 : 0.12 };
}

export function detectSpoofing(frameData: string): { isSpoofed: boolean; confidence: number } {
    if (!frameData || frameData.length < 32) {
        return { isSpoofed: true, confidence: 0.95 };
    }
    const compact = frameData.slice(0, 2048);
    const uniqueChars = new Set(compact).size;
    const entropyProxy = uniqueChars / 64;
    const isSpoofed = entropyProxy < 0.25;
    return { isSpoofed, confidence: Number((1 - Math.min(1, entropyProxy)).toFixed(3)) };
}

export function getUserLivenessStatus(userId: string): { verified: boolean; lastVerification: Date | null; score: number } {
    const status = userLivenessStatus.get(userId);
    return status ? { ...status } : { verified: false, lastVerification: null, score: 0 };
}

export function generateFaceEmbedding(_frameData: string): string | null {
    throw new LivenessValidationError('deprecated_embedding_path', 'Use model-sidecar embedding extraction contract');
}
