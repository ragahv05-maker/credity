/**
 * Biometrics Service
 * Implements PRD v3.1 Layer 1: Biometric Authentication
 * 
 * Features:
 * - Face ID / Touch ID enrollment
 * - Biometric verification for sensitive actions
 * - Secure storage of biometric templates
 */

export interface BiometricEnrollment {
    id: string;
    userId: string;
    type: 'face_id' | 'fingerprint' | 'both';
    enrolledAt: Date;
    lastUsedAt: Date | null;
    deviceId: string;
    status: 'active' | 'disabled' | 'expired';
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
    expiresAt: Date;  // Token valid for 5 minutes
}

// Store enrollments
const enrollments = new Map<string, BiometricEnrollment>();
const verificationTokens = new Map<string, BiometricVerifyResult>();

/**
 * Check if biometrics are available on device
 */
export function checkBiometricAvailability(): {
    available: boolean;
    types: ('face_id' | 'fingerprint')[];
} {
    // In production, this would check via WebAuthn API
    // For demo, assume both are available
    return {
        available: true,
        types: ['face_id', 'fingerprint']
    };
}

/**
 * Enroll user biometrics
 */
export function enrollBiometrics(
    userId: string,
    type: 'face_id' | 'fingerprint' | 'both',
    deviceId: string
): BiometricEnrollment {
    const enrollment: BiometricEnrollment = {
        id: `bio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type,
        enrolledAt: new Date(),
        lastUsedAt: null,
        deviceId,
        status: 'active'
    };

    console.log('[Biometrics] Enrolling user:', userId, 'type:', type);
    enrollments.set(userId, enrollment);
    console.log('[Biometrics] Enrollments now:', Array.from(enrollments.keys()));
    return enrollment;
}

/**
 * Check if user has biometrics enrolled
 */
export function hasEnrolledBiometrics(userId: string): boolean {
    const enrollment = enrollments.get(userId);
    return enrollment !== undefined && enrollment.status === 'active';
}

/**
 * Get user's biometric enrollment
 */
export function getBiometricEnrollment(userId: string): BiometricEnrollment | null {
    return enrollments.get(userId) || null;
}

/**
 * Request biometric verification
 * This would trigger native biometric prompt on device
 */
export function requestBiometricVerification(request: BiometricVerifyRequest): {
    challengeId: string;
    promptRequired: boolean;
    fallbackAvailable: boolean;
} {
    const enrollment = enrollments.get(request.userId);

    if (!enrollment || enrollment.status !== 'active') {
        return {
            challengeId: '',
            promptRequired: false,
            fallbackAvailable: true
        };
    }

    const challengeId = `bio_challenge_${Date.now()}`;

    return {
        challengeId,
        promptRequired: true,
        fallbackAvailable: true
    };
}

/**
 * Verify biometric response
 */
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
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    };

    if (success) {
        // Update last used
        const enrollment = enrollments.get(userId);
        if (enrollment) {
            enrollment.lastUsedAt = new Date();
        }

        // Store verification token
        verificationTokens.set(`${userId}_${challengeId}`, result);
    }

    return result;
}

/**
 * Check if user has valid verification token
 */
export function hasValidVerificationToken(userId: string): boolean {
    for (const [key, token] of verificationTokens.entries()) {
        if (key.startsWith(`${userId}_`) && token.expiresAt > new Date()) {
            return true;
        }
    }
    return false;
}

/**
 * Disable biometrics for user
 */
export function disableBiometrics(userId: string): boolean {
    const enrollment = enrollments.get(userId);
    if (enrollment) {
        enrollment.status = 'disabled';
        return true;
    }
    return false;
}

/**
 * Re-enable biometrics
 */
export function enableBiometrics(userId: string): boolean {
    const enrollment = enrollments.get(userId);
    if (enrollment && enrollment.status === 'disabled') {
        enrollment.status = 'active';
        return true;
    }
    return false;
}

/**
 * Get biometric status for trust score
 */
export function getBiometricStatus(userId: string): {
    enrolled: boolean;
    type: string | null;
    lastVerified: Date | null;
} {
    console.log('[Biometrics] Getting status for user:', userId);
    console.log('[Biometrics] Available enrollments:', Array.from(enrollments.keys()));
    const enrollment = enrollments.get(userId);
    console.log('[Biometrics] Found enrollment:', enrollment ? 'yes' : 'no');

    if (!enrollment || enrollment.status !== 'active') {
        return {
            enrolled: false,
            type: null,
            lastVerified: null
        };
    }

    return {
        enrolled: true,
        type: enrollment.type,
        lastVerified: enrollment.lastUsedAt
    };
}
