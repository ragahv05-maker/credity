import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Security: Require secrets from environment - fail fast if not set
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // PRD: 30-day max session lifecycle
const JWT_ALGORITHM = 'HS256' as const;
const requireStrictSecrets =
    process.env.NODE_ENV === 'production' || process.env.REQUIRE_DATABASE === 'true';
const missingJwtSecrets = !JWT_SECRET || !JWT_REFRESH_SECRET;

if (missingJwtSecrets && requireStrictSecrets) {
    console.error('FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables');
    process.exit(1);
}

// Fallback for development only (logged warning)
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'dev-only-secret-not-for-production';
const EFFECTIVE_JWT_REFRESH_SECRET = JWT_REFRESH_SECRET || 'dev-only-refresh-secret-not-for-production';
if (missingJwtSecrets && !requireStrictSecrets) {
    console.warn('WARNING: Using development JWT secrets. Set JWT_SECRET and JWT_REFRESH_SECRET for staging/production.');
}

// In-memory token storage (use Redis in production)
const refreshTokens = new Map<string, {
    userId: number;
    expiresAt: Date;
    sessionStartedAt: Date;
    sessionId: string;
}>();
const invalidatedTokens = new Map<string, number>();

export interface AuthUser {
    id: number;
    username: string;
    email?: string;
    role: 'admin' | 'issuer' | 'holder' | 'verifier';
}

export interface TokenPayload {
    userId: number;
    username: string;
    role: string;
    type: 'access' | 'refresh';
    sid?: string;
}

/**
 * Password strength validation
 */
export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    if (password.length > 128) {
        errors.push('Password must not exceed 128 characters');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
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
    };
    return jwt.sign(payload, EFFECTIVE_JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: JWT_ALGORITHM });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(
    user: AuthUser,
    options?: { sessionStartedAt?: Date; sessionId?: string },
): string {
    const sessionId = options?.sessionId ?? crypto.randomUUID();
    const payload: TokenPayload & { sid?: string } = {
        userId: user.id,
        username: user.username,
        role: user.role,
        type: 'refresh',
        sid: sessionId,
    };
    const token = jwt.sign(payload, EFFECTIVE_JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY, algorithm: JWT_ALGORITHM });

    // Store refresh token
    refreshTokens.set(token, {
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        sessionStartedAt: options?.sessionStartedAt ?? new Date(),
        sessionId,
    });

    return token;
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
    try {
        if (invalidatedTokens.has(token)) {
            return null;
        }
        const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET, { algorithms: [JWT_ALGORITHM] }) as TokenPayload;
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
    try {
        if (!refreshTokens.has(token)) {
            return null;
        }
        const decoded = jwt.verify(token, EFFECTIVE_JWT_REFRESH_SECRET, { algorithms: [JWT_ALGORITHM] }) as TokenPayload;
        if (decoded.type !== 'refresh') {
            return null;
        }
        return decoded;
    } catch {
        return null;
    }
}

/**
 * Invalidate refresh token (logout)
 */
export function invalidateRefreshToken(token: string): void {
    refreshTokens.delete(token);
}

/**
 * Invalidate access token
 */
export function invalidateAccessToken(token: string): void {
    try {
        // Decode token to get expiration
        const decoded = jwt.decode(token) as { exp?: number } | null;

        // Optimization: If token is malformed, we don't need to blacklist it
        // because verifyAccessToken will fail signature/format checks anyway.
        if (!decoded) return;

        // Default to 1 hour if no exp found
        const expiry = decoded?.exp ? decoded.exp * 1000 : Date.now() + 60 * 60 * 1000;

        invalidatedTokens.set(token, expiry);
    } catch {
        // Ignore invalid tokens
        return;
    }

    // Clean up old tokens periodically
    if (invalidatedTokens.size > 10000) {
        const now = Date.now();
        for (const [t, exp] of invalidatedTokens.entries()) {
            if (now > exp) {
                invalidatedTokens.delete(t);
            }
        }

        // If still full, evict oldest to prevent memory leak
        if (invalidatedTokens.size > 10000) {
            const firstKey = invalidatedTokens.keys().next().value;
            if (firstKey) invalidatedTokens.delete(firstKey);
        }
    }
}

/**
 * Refresh access token using refresh token
 */
export function refreshAccessToken(refreshToken: string): { accessToken: string; refreshToken: string } | null {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
        return null;
    }

    const sessionRecord = refreshTokens.get(refreshToken);
    if (!sessionRecord) {
        return null;
    }

    const sessionAgeMs = Date.now() - sessionRecord.sessionStartedAt.getTime();
    if (sessionAgeMs > SESSION_MAX_AGE_MS) {
        invalidateRefreshToken(refreshToken);
        return null;
    }

    // Invalidate old refresh token (rotation)
    invalidateRefreshToken(refreshToken);

    const user: AuthUser = {
        id: payload.userId,
        username: payload.username,
        role: payload.role as AuthUser['role'],
    };

    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user, {
            sessionStartedAt: sessionRecord.sessionStartedAt,
            sessionId: sessionRecord.sessionId,
        }),
    };
}

/**
 * Generate a secure API key
 */
export function generateApiKey(): string {
    return `cv_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Hash API key for storage
 */
export function hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Express middleware types
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

/**
 * JWT Authentication Middleware
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    if (!payload) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }

    req.user = payload;
    next();
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = verifyAccessToken(token);
        if (payload) {
            req.user = payload;
        }
    }

    next();
}

/**
 * Role-based access control middleware
 */
export function requireRole(...roles: AuthUser['role'][]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!roles.includes(req.user.role as AuthUser['role'])) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        next();
    };
}

/**
 * Rate limiting helper
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (!record || now > record.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (record.count >= maxRequests) {
        return false;
    }

    record.count++;
    return true;
}

export function getSessionPolicyEvidence(refreshToken: string): {
    sessionStartedAt: Date;
    sessionAgeMs: number;
    maxAgeMs: number;
    sessionId: string;
} | null {
    const record = refreshTokens.get(refreshToken);
    if (!record) return null;

    return {
        sessionStartedAt: record.sessionStartedAt,
        sessionAgeMs: Date.now() - record.sessionStartedAt.getTime(),
        maxAgeMs: SESSION_MAX_AGE_MS,
        sessionId: record.sessionId,
    };
}

export function __test_backdateRefreshSession(refreshToken: string, sessionStartedAt: Date): boolean {
    const record = refreshTokens.get(refreshToken);
    if (!record) return false;
    refreshTokens.set(refreshToken, { ...record, sessionStartedAt });
    return true;
}
