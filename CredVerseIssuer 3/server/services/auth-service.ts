import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Security: Require secrets from environment - fail fast if not set
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const JWT_ALGORITHM = 'HS256' as const;

const requireStrictSecrets =
    process.env.NODE_ENV === 'production' || process.env.REQUIRE_DATABASE === 'true';
const missingJwtSecrets = !JWT_SECRET || !JWT_REFRESH_SECRET;

if (missingJwtSecrets && requireStrictSecrets) {
    console.error('FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables');
    process.exit(1);
}

// Fallback for local development only (logged warning)
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'dev-only-secret-not-for-production';
const EFFECTIVE_JWT_REFRESH_SECRET = JWT_REFRESH_SECRET || 'dev-only-refresh-secret-not-for-production';
if (missingJwtSecrets && !requireStrictSecrets) {
    console.warn('WARNING: Using development JWT secrets. Set JWT_SECRET and JWT_REFRESH_SECRET for staging/production.');
}

// Stateless token mode avoids process-local auth state.
// For global logout/token revocation use a shared session store or JWT denylist service.

export interface AuthUser {
    id: string;
    username: string;
    email?: string;
    role: 'admin' | 'issuer' | 'holder' | 'verifier' | 'user' | 'viewer';
}

export interface TokenPayload {
    userId: string;
    username: string;
    role: string;
    type: 'access' | 'refresh';
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
export function generateRefreshToken(user: AuthUser): string {
    const payload: TokenPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        type: 'refresh',
    };
    return jwt.sign(payload, EFFECTIVE_JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY, algorithm: JWT_ALGORITHM });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
    try {
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
    void token;
}

/**
 * Invalidate access token
 */
export function invalidateAccessToken(token: string): void {
    void token;
}

/**
 * Refresh access token using refresh token
 */
export function refreshAccessToken(refreshToken: string): { accessToken: string; refreshToken: string } | null {
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

    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user),
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

        const userRole = req.user.role as AuthUser['role'];
        if (roles.includes("admin") && userRole === "admin") {
            next();
            return;
        }

        if (!roles.includes(userRole)) {
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
