import { authenticator } from 'otplib';
import QRCode from 'qrcode';

/**
 * Two-Factor Authentication Service for CredVerse Issuer
 * Implements TOTP (Time-based One-Time Password) using RFC 6238
 */

export interface TwoFactorSetup {
    secret: string;
    otpAuthUrl: string;
    qrCodeDataUrl: string;
}

export interface TwoFactorConfig {
    userId: string;
    secret: string;
    enabled: boolean;
    backupCodes: string[];
    enabledAt?: Date;
}

// In-memory storage for 2FA configs (use database in production)
const twoFactorConfigs = new Map<string, TwoFactorConfig>();

// Rate limiting for 2FA verification attempts
const verificationAttempts = new Map<string, { count: number; lastAttempt: Date }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/**
 * Generate a new 2FA secret and QR code for setup
 */
export async function generateTwoFactorSetup(userId: string, email: string): Promise<TwoFactorSetup> {
    // Generate a secure random secret
    const secret = authenticator.generateSecret(20);

    // Create OTP Auth URL for authenticator apps
    const otpAuthUrl = authenticator.keyuri(email, 'CredVerse Issuer', secret);

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // Store the secret (not enabled yet)
    twoFactorConfigs.set(userId, {
        userId,
        secret,
        enabled: false,
        backupCodes: generateBackupCodes(),
    });

    console.log(`[2FA] Setup generated for user ${userId}`);

    return {
        secret,
        otpAuthUrl,
        qrCodeDataUrl,
    };
}

/**
 * Verify a TOTP token and enable 2FA if valid
 */
export function verifyAndEnable(userId: string, token: string): { success: boolean; backupCodes?: string[]; error?: string } {
    // Check rate limiting
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
        return { success: false, error: rateLimitCheck.error };
    }

    const config = twoFactorConfigs.get(userId);
    if (!config) {
        return { success: false, error: '2FA setup not found. Please start setup again.' };
    }

    // Verify the token
    const isValid = authenticator.verify({ token, secret: config.secret });

    if (!isValid) {
        recordFailedAttempt(userId);
        return { success: false, error: 'Invalid verification code. Please try again.' };
    }

    // Enable 2FA
    config.enabled = true;
    config.enabledAt = new Date();
    twoFactorConfigs.set(userId, config);

    // Clear rate limit on success
    verificationAttempts.delete(userId);

    console.log(`[2FA] Enabled for user ${userId}`);

    return {
        success: true,
        backupCodes: config.backupCodes
    };
}

/**
 * Verify a TOTP token for login
 */
export function verifyToken(userId: string, token: string): { success: boolean; error?: string } {
    // Check rate limiting
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
        return { success: false, error: rateLimitCheck.error };
    }

    const config = twoFactorConfigs.get(userId);
    if (!config || !config.enabled) {
        return { success: false, error: '2FA not enabled for this user' };
    }

    // Check if it's a backup code
    const backupIndex = config.backupCodes.indexOf(token.toUpperCase());
    if (backupIndex !== -1) {
        // Remove used backup code
        config.backupCodes.splice(backupIndex, 1);
        twoFactorConfigs.set(userId, config);
        console.log(`[2FA] Backup code used for user ${userId}`);
        verificationAttempts.delete(userId);
        return { success: true };
    }

    // Verify TOTP
    const isValid = authenticator.verify({ token, secret: config.secret });

    if (!isValid) {
        recordFailedAttempt(userId);
        return { success: false, error: 'Invalid verification code' };
    }

    verificationAttempts.delete(userId);
    return { success: true };
}

/**
 * Check if 2FA is enabled for a user
 */
export function isTwoFactorEnabled(userId: string): boolean {
    const config = twoFactorConfigs.get(userId);
    return config?.enabled ?? false;
}

/**
 * Disable 2FA for a user
 */
export function disableTwoFactor(userId: string): boolean {
    const config = twoFactorConfigs.get(userId);
    if (!config) return false;

    twoFactorConfigs.delete(userId);
    console.log(`[2FA] Disabled for user ${userId}`);
    return true;
}

/**
 * Regenerate backup codes
 */
export function regenerateBackupCodes(userId: string): string[] | null {
    const config = twoFactorConfigs.get(userId);
    if (!config || !config.enabled) return null;

    config.backupCodes = generateBackupCodes();
    twoFactorConfigs.set(userId, config);

    console.log(`[2FA] Backup codes regenerated for user ${userId}`);
    return config.backupCodes;
}

/**
 * Get user's 2FA status
 */
export function getTwoFactorStatus(userId: string): { enabled: boolean; backupCodesRemaining: number } {
    const config = twoFactorConfigs.get(userId);
    return {
        enabled: config?.enabled ?? false,
        backupCodesRemaining: config?.backupCodes.length ?? 0,
    };
}

// Helper: Generate backup codes
function generateBackupCodes(): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    for (let i = 0; i < 10; i++) {
        let code = '';
        for (let j = 0; j < 8; j++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Format as XXXX-XXXX
        codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }

    return codes;
}

// Helper: Check rate limiting
function checkRateLimit(userId: string): { allowed: boolean; error?: string } {
    const attempts = verificationAttempts.get(userId);

    if (attempts) {
        const minutesSinceLastAttempt = (Date.now() - attempts.lastAttempt.getTime()) / (1000 * 60);

        if (attempts.count >= MAX_ATTEMPTS && minutesSinceLastAttempt < LOCKOUT_MINUTES) {
            const remainingMinutes = Math.ceil(LOCKOUT_MINUTES - minutesSinceLastAttempt);
            return {
                allowed: false,
                error: `Too many failed attempts. Please try again in ${remainingMinutes} minutes.`
            };
        }

        // Reset if lockout period has passed
        if (minutesSinceLastAttempt >= LOCKOUT_MINUTES) {
            verificationAttempts.delete(userId);
        }
    }

    return { allowed: true };
}

// Helper: Record failed attempt
function recordFailedAttempt(userId: string): void {
    const attempts = verificationAttempts.get(userId);

    if (attempts) {
        attempts.count++;
        attempts.lastAttempt = new Date();
    } else {
        verificationAttempts.set(userId, { count: 1, lastAttempt: new Date() });
    }
}
