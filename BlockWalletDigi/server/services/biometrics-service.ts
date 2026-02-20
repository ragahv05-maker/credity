import { decrypt, encrypt, generateEncryptionKey, sha256, type EncryptedData } from './crypto-utils';
import { matchFace } from './face-match-service';

export interface BiometricTemplateRecord {
    encryptedTemplate: EncryptedData;
    templateHash: string;
    dimensions: number;
    algorithm: 'face_embedding_v1';
    createdAt: Date;
    updatedAt: Date;
}

export interface BiometricEnrollment {
    id: string;
    userId: string;
    type: 'face_id' | 'fingerprint' | 'both';
    enrolledAt: Date;
    lastUsedAt: Date | null;
    deviceId: string;
    status: 'active' | 'disabled' | 'expired';
    metadata: {
        algorithm: 'face_embedding_v1';
        dimensions: number;
        templateHash: string;
    } | null;
}

export interface BiometricVerifyRequest {
    userId: string;
    action: 'claim_submit' | 'credential_share' | 'document_access' | 'settings_change';
    deviceId: string;
}

export interface BiometricVerifyResult {
    success: boolean;
    method: 'face_id' | 'fingerprint' | 'passcode_fallback';
    confidence: number;
    timestamp: Date;
    expiresAt: Date;
    reason?: string;
}

const enrollments = new Map<string, BiometricEnrollment>();
const encryptedTemplates = new Map<string, BiometricTemplateRecord>();
const verificationTokens = new Map<string, BiometricVerifyResult>();
const biometricsKey = process.env.BIOMETRIC_TEMPLATE_KEY || generateEncryptionKey();

function normalizeEmbedding(input: number[]): number[] {
    if (!Array.isArray(input) || input.length < 4) {
        throw new Error('face embedding must contain at least 4 dimensions');
    }
    if (input.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
        throw new Error('face embedding contains non-numeric values');
    }
    return input.map((value) => Number(value.toFixed(8)));
}

function getActiveEnrollment(userId: string): BiometricEnrollment {
    const enrollment = enrollments.get(userId);
    if (!enrollment || enrollment.status !== 'active') {
        throw new Error('active biometric enrollment not found');
    }
    return enrollment;
}

function serializeEmbedding(embedding: number[]): string {
    return JSON.stringify(normalizeEmbedding(embedding));
}

function deserializeEmbedding(payload: string): number[] {
    const parsed = JSON.parse(payload);
    return normalizeEmbedding(parsed);
}

export function checkBiometricAvailability(): { available: boolean; types: ('face_id' | 'fingerprint')[] } {
    return { available: true, types: ['face_id', 'fingerprint'] };
}

export function enrollBiometrics(
    userId: string,
    type: 'face_id' | 'fingerprint' | 'both',
    deviceId: string,
    faceEmbedding?: number[]
): BiometricEnrollment {
    if (!userId) throw new Error('userId is required');
    if (!type) throw new Error('type is required');

    let metadata: BiometricEnrollment['metadata'] = null;
    if (faceEmbedding && faceEmbedding.length > 0) {
        const serialized = serializeEmbedding(faceEmbedding);
        const encryptedTemplate = encrypt(serialized, biometricsKey);
        const templateHash = sha256(serialized);
        encryptedTemplates.set(userId, {
            encryptedTemplate,
            templateHash,
            dimensions: faceEmbedding.length,
            algorithm: 'face_embedding_v1',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        metadata = {
            algorithm: 'face_embedding_v1',
            dimensions: faceEmbedding.length,
            templateHash,
        };
    }

    const enrollment: BiometricEnrollment = {
        id: `bio_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId,
        type,
        enrolledAt: new Date(),
        lastUsedAt: null,
        deviceId,
        status: 'active',
        metadata,
    };

    enrollments.set(userId, enrollment);
    return enrollment;
}

export function hasEnrolledBiometrics(userId: string): boolean {
    const enrollment = enrollments.get(userId);
    return enrollment !== undefined && enrollment.status === 'active';
}

export function getBiometricEnrollment(userId: string): BiometricEnrollment | null {
    return enrollments.get(userId) || null;
}

export function requestBiometricVerification(request: BiometricVerifyRequest): {
    challengeId: string;
    promptRequired: boolean;
    fallbackAvailable: boolean;
} {
    const enrollment = enrollments.get(request.userId);
    if (!enrollment || enrollment.status !== 'active') {
        return { challengeId: '', promptRequired: false, fallbackAvailable: true };
    }

    return {
        challengeId: `bio_challenge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        promptRequired: true,
        fallbackAvailable: true,
    };
}

export function verifyBiometricEmbedding(
    userId: string,
    challengeId: string,
    liveFaceEmbedding: number[],
    antiSpoof?: { liveSpoofRisk?: number; liveFaceDetected?: boolean }
): BiometricVerifyResult {
    const enrollment = getActiveEnrollment(userId);
    const stored = encryptedTemplates.get(userId);
    if (!stored) {
        throw new Error('biometric template not found');
    }

    const decrypted = decrypt(stored.encryptedTemplate, biometricsKey);
    const storedEmbedding = deserializeEmbedding(decrypted);
    const normalizedLive = normalizeEmbedding(liveFaceEmbedding);

    const faceMatch = matchFace({
        idFaceEmbedding: storedEmbedding,
        liveFaceEmbedding: normalizedLive,
        threshold: 0.84,
        antiSpoof: {
            idSpoofRisk: 0,
            liveSpoofRisk: antiSpoof?.liveSpoofRisk ?? 0,
            requireLiveFace: true,
            liveFaceDetected: antiSpoof?.liveFaceDetected ?? false,
        },
    });

    const result: BiometricVerifyResult = {
        success: faceMatch.matched,
        method: 'face_id',
        confidence: faceMatch.confidence,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        reason: faceMatch.matched ? undefined : 'face_mismatch',
    };

    if (result.success) {
        enrollment.lastUsedAt = new Date();
        verificationTokens.set(`${userId}_${challengeId}`, result);
    }

    return result;
}

export function verifyBiometricResponse(
    challengeId: string,
    userId: string,
    success: boolean,
    method: 'face_id' | 'fingerprint' | 'passcode_fallback'
): BiometricVerifyResult {
    const result: BiometricVerifyResult = {
        success,
        method,
        confidence: success ? 0.98 : 0,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        reason: success ? undefined : 'biometric_prompt_failed',
    };

    if (success) {
        const enrollment = enrollments.get(userId);
        if (enrollment) enrollment.lastUsedAt = new Date();
        verificationTokens.set(`${userId}_${challengeId}`, result);
    }

    return result;
}

export function hasValidVerificationToken(userId: string): boolean {
    for (const [key, token] of verificationTokens.entries()) {
        if (key.startsWith(`${userId}_`) && token.expiresAt > new Date()) return true;
    }
    return false;
}

export function disableBiometrics(userId: string): boolean {
    const enrollment = enrollments.get(userId);
    if (!enrollment) return false;
    enrollment.status = 'disabled';
    return true;
}

export function enableBiometrics(userId: string): boolean {
    const enrollment = enrollments.get(userId);
    if (!enrollment || enrollment.status !== 'disabled') return false;
    enrollment.status = 'active';
    return true;
}

export function getBiometricStatus(userId: string): { enrolled: boolean; type: string | null; lastVerified: Date | null } {
    const enrollment = enrollments.get(userId);
    if (!enrollment || enrollment.status !== 'active') {
        return { enrolled: false, type: null, lastVerified: null };
    }
    return {
        enrolled: true,
        type: enrollment.type,
        lastVerified: enrollment.lastUsedAt,
    };
}

export function __unsafeTemplateRecordForTests(userId: string): BiometricTemplateRecord | null {
    return encryptedTemplates.get(userId) ?? null;
}
