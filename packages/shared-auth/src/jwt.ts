/**
 * JWT token generation and verification utilities
 */
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import type { AuthUser, TokenPayload, TokenPair, AuthConfig, VerifyTokenResult, TokenRevocationStore } from './types';

const DEFAULT_ACCESS_EXPIRY = '15m';
const DEFAULT_REFRESH_EXPIRY = '7d';
const JWT_ALGORITHM = 'HS256' as const;

// Default In-Memory Store
class InMemoryRevocationStore implements TokenRevocationStore {
    private revoked = new Map<string, number>(); // token -> expiry timestamp
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        // Cleanup every minute
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
        if (typeof this.cleanupInterval.unref === 'function') {
            this.cleanupInterval.unref();
        }
    }

    add(token: string, expirySeconds: number = 900): void {
        const expiresAt = Date.now() + (expirySeconds * 1000);
        this.revoked.set(token, expiresAt);
    }

    has(token: string): boolean {
        const expiresAt = this.revoked.get(token);
        if (!expiresAt) return false;
        if (Date.now() > expiresAt) {
            this.revoked.delete(token);
            return false;
        }
        return true;
    }

    remove(token: string): void {
        this.revoked.delete(token);
    }

    cleanup() {
        const now = Date.now();
        for (const [token, expiry] of this.revoked.entries()) {
            if (now > expiry) {
                this.revoked.delete(token);
            }
        }
    }
}

let config: AuthConfig = {
    jwtSecret: 'dev-only-secret-not-for-production',
    jwtRefreshSecret: 'dev-only-refresh-secret-not-for-production',
    accessTokenExpiry: DEFAULT_ACCESS_EXPIRY,
    refreshTokenExpiry: DEFAULT_REFRESH_EXPIRY,
    app: 'unknown',
    revocationStore: new InMemoryRevocationStore(),
};

/**
 * Initialize auth configuration
 */
export function initAuth(authConfig: Partial<AuthConfig>): void {
    config = {
        ...config,
        ...authConfig,
    };

    if (!config.revocationStore) {
        config.revocationStore = new InMemoryRevocationStore();
    }

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
        jti: crypto.randomUUID(),
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
        jti: crypto.randomUUID(),
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
 * Verify access token (Async)
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
    try {
        // Check revocation
        if (config.revocationStore && await config.revocationStore.has(token)) {
            return null;
        }

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
 * Verify refresh token (Async)
 */
export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
    try {
        // Check revocation
        if (config.revocationStore && await config.revocationStore.has(token)) {
            return null;
        }

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
export async function verifyToken(token: string): Promise<VerifyTokenResult> {
    const payload = await verifyAccessToken(token);

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
export async function invalidateRefreshToken(token: string): Promise<void> {
    if (config.revocationStore) {
        // Default refresh expiry 7d = 604800s
        await config.revocationStore.add(token, 604800);
    }
}

/**
 * Invalidate access token
 */
export async function invalidateAccessToken(token: string): Promise<void> {
    if (config.revocationStore) {
        // Default access expiry 15m = 900s
        await config.revocationStore.add(token, 900);
    }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
        return null;
    }

    // Invalidate old refresh token (rotation)
    await invalidateRefreshToken(refreshToken);

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
