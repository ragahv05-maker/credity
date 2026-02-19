/**
 * JWT token generation and verification utilities
 */
import jwt from 'jsonwebtoken';
import type { AuthUser, TokenPayload, TokenPair, AuthConfig, VerifyTokenResult } from './types.js';

const DEFAULT_ACCESS_EXPIRY = '15m';
const DEFAULT_REFRESH_EXPIRY = '7d';
const JWT_ALGORITHM = 'HS256' as const;

// Stateless token mode avoids process-local auth state.
// For global logout/token revocation use a shared session store or JWT denylist service.


interface RevokedTokenRecord {
    expiresAt: number;
}

const revokedAccessTokens = new Map<string, RevokedTokenRecord>();
const revokedRefreshTokens = new Map<string, RevokedTokenRecord>();

function pruneRevokedTokens(now: number = Date.now()): void {
    for (const [token, record] of revokedAccessTokens.entries()) {
        if (record.expiresAt <= now) revokedAccessTokens.delete(token);
    }
    for (const [token, record] of revokedRefreshTokens.entries()) {
        if (record.expiresAt <= now) revokedRefreshTokens.delete(token);
    }
}

function decodeTokenExpiryMs(token: string, secret: string): number | null {
    try {
        const decoded = jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] }) as TokenPayload & { exp?: number };
        if (!decoded?.exp) return null;
        return decoded.exp * 1000;
    } catch {
        return null;
    }
}

let config: AuthConfig = {
    jwtSecret: 'dev-only-secret-not-for-production',
    jwtRefreshSecret: 'dev-only-refresh-secret-not-for-production',
    accessTokenExpiry: DEFAULT_ACCESS_EXPIRY,
    refreshTokenExpiry: DEFAULT_REFRESH_EXPIRY,
    app: 'unknown',
};

/**
 * Initialize auth configuration
 */
export function initAuth(authConfig: Partial<AuthConfig>): void {
    config = {
        ...config,
        ...authConfig,
    };

    if (process.env.NODE_ENV === 'production') {
        if (!config.jwtSecret || config.jwtSecret === 'dev-only-secret-not-for-production') {
            throw new Error('SECURITY CRITICAL: JWT_SECRET must be set to a strong value in production.');
        }
        if (!config.jwtRefreshSecret || config.jwtRefreshSecret === 'dev-only-refresh-secret-not-for-production') {
            throw new Error('SECURITY CRITICAL: JWT_REFRESH_SECRET must be set to a strong value in production.');
        }
    } else {
        if (!authConfig.jwtSecret) {
            console.warn('WARNING: Using development JWT secrets. Set JWT_SECRET for production.');
        }
    }
}

/**
 * Generate access token
 */
export function generateAccessToken(user: AuthUser): string {
    const payload: TokenPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        type: 'access',
        app: config.app,
    };
    return jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.accessTokenExpiry || DEFAULT_ACCESS_EXPIRY,
        algorithm: JWT_ALGORITHM
    } as jwt.SignOptions);
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(user: AuthUser): string {
    const payload: TokenPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        type: 'refresh',
        app: config.app,
    };
    return jwt.sign(payload, config.jwtRefreshSecret, {
        expiresIn: config.refreshTokenExpiry || DEFAULT_REFRESH_EXPIRY,
        algorithm: JWT_ALGORITHM
    } as jwt.SignOptions);
}

/**
 * Generate both tokens
 */
export function generateTokenPair(user: AuthUser): TokenPair {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user),
        expiresIn: 900, // 15 minutes in seconds
    };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
    pruneRevokedTokens();
    if (revokedAccessTokens.has(token)) {
        return null;
    }
    try {
        const decoded = jwt.verify(token, config.jwtSecret, { algorithms: [JWT_ALGORITHM] }) as TokenPayload;
        if (decoded.type !== 'access') {
            return null;
        }
        return decoded;
    } catch {
        return null;
    }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
    pruneRevokedTokens();
    if (revokedRefreshTokens.has(token)) {
        return null;
    }
    try {
        const decoded = jwt.verify(token, config.jwtRefreshSecret, { algorithms: [JWT_ALGORITHM] }) as TokenPayload;
        if (decoded.type !== 'refresh') {
            return null;
        }
        return decoded;
    } catch {
        return null;
    }
}

/**
 * Verify token and return structured result (for cross-app validation)
 */
export function verifyToken(token: string): VerifyTokenResult {
    const payload = verifyAccessToken(token);

    if (!payload) {
        return { valid: false, error: 'Invalid or expired token' };
    }

    return {
        valid: true,
        user: {
            userId: payload.userId,
            username: payload.username,
            role: payload.role,
        },
        app: config.app,
    };
}

/**
 * Invalidate refresh token (logout)
 */
export function invalidateRefreshToken(token: string): void {
    const expiresAt = decodeTokenExpiryMs(token, config.jwtRefreshSecret);
    if (expiresAt && expiresAt > Date.now()) {
        revokedRefreshTokens.set(token, { expiresAt });
    }
    pruneRevokedTokens();
}

/**
 * Invalidate access token
 */
export function invalidateAccessToken(token: string): void {
    const expiresAt = decodeTokenExpiryMs(token, config.jwtSecret);
    if (expiresAt && expiresAt > Date.now()) {
        revokedAccessTokens.set(token, { expiresAt });
    }
    pruneRevokedTokens();
}

/**
 * Refresh access token using refresh token
 */
export function refreshAccessToken(refreshToken: string): TokenPair | null {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
        return null;
    }

    // Invalidate old refresh token (rotation)
    invalidateRefreshToken(refreshToken);

    const user: AuthUser = {
        id: payload.userId,
        username: payload.username,
        role: payload.role as AuthUser['role'],
    };

    return generateTokenPair(user);
}

/**
 * Get current auth configuration
 */
export function getAuthConfig(): Readonly<AuthConfig> {
    return { ...config };
}
