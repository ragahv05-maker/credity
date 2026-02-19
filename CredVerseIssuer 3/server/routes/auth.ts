import { Router } from 'express';
import { storage } from '../storage';
import {
    hashPassword,
    comparePassword,
    generateAccessToken,
    generateRefreshToken,
    refreshAccessToken,
    invalidateRefreshToken,
    invalidateAccessToken,
    verifyAccessToken,
    authMiddleware,
    checkRateLimit,
    AuthUser,
} from '@credverse/shared-auth';
import { isTwoFactorEnabled, getTwoFactorStatus } from '../services/two-factor';
import crypto from 'crypto';

const router = Router();

// Temporary pending tokens for 2FA flow (map of pending token -> userId)
const pendingTwoFactorTokens = new Map<string, { userId: string; expiresAt: Date }>();

/**
 * Register a new user
 */
router.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Rate limit registration
        if (!checkRateLimit(`register:${req.ip}`, 5, 60 * 60 * 1000)) {
            return res.status(429).json({ error: 'Too many registration attempts' });
        }

        // Check if user exists
        const existing = await storage.getUserByUsername(username);
        if (existing) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        // Using Type Assertion as storage.createUser expects InsertUser
        const user = await storage.createUser({
            username,
            password: passwordHash,
            role: 'user',
            // tenantId can be set later or passed if multi-tenant
            // For MVP, allow creating users without tenant or auto-assign
        } as any);

        // Generate tokens
        const authUser: AuthUser = {
            id: user.id,
            username: user.username,
            role: user.role as AuthUser['role'],
        };

        const accessToken = generateAccessToken(authUser);
        const refreshToken = generateRefreshToken(authUser);

        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: 900, // 15 minutes
            },
        });
    } catch (error: any) {
        console.error('[Auth] Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * Login with username/password
 * If 2FA is enabled, returns a pending token instead of access tokens
 */
router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Rate limit login attempts
        if (!checkRateLimit(`login:${username}`, 10, 15 * 60 * 1000)) {
            return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
        }

        // Find user
        const user = await storage.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const valid = await comparePassword(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if 2FA is enabled
        if (isTwoFactorEnabled(user.id)) {
            // Generate pending token for 2FA verification
            const pendingToken = crypto.randomBytes(32).toString('hex');
            pendingTwoFactorTokens.set(pendingToken, {
                userId: user.id,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
            });

            // Clean up expired tokens
            Array.from(pendingTwoFactorTokens.entries()).forEach(([token, data]) => {
                if (data.expiresAt < new Date()) {
                    pendingTwoFactorTokens.delete(token);
                }
            });

            return res.json({
                success: true,
                requires2FA: true,
                pendingToken,
                userId: user.id,
                message: 'Please enter your 2FA code to complete login',
            });
        }

        // No 2FA - generate tokens directly
        const authUser: AuthUser = {
            id: user.id,
            username: user.username,
            role: user.role as AuthUser['role'],
        };

        const accessToken = generateAccessToken(authUser);
        const refreshToken = generateRefreshToken(authUser);

        res.json({
            success: true,
            requires2FA: false,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: 900,
            },
        });
    } catch (error: any) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Export pending tokens map for 2FA routes
export { pendingTwoFactorTokens };

/**
 * Refresh access token
 */
router.post('/auth/refresh', (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        const tokens = refreshAccessToken(refreshToken);
        if (!tokens) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        res.json({
            success: true,
            tokens: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: 900,
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Token refresh failed' });
    }
});

/**
 * Logout - invalidate tokens
 */
router.post('/auth/logout', authMiddleware as any, (req, res) => {
    try {
        const { refreshToken } = req.body;
        const authHeader = req.headers.authorization;

        if (refreshToken) {
            invalidateRefreshToken(refreshToken);
        }

        if (authHeader) {
            const accessToken = authHeader.substring(7);
            invalidateAccessToken(accessToken);
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Logout failed' });
    }
});

/**
 * Get current user profile
 */
router.get('/auth/me', authMiddleware as any, async (req, res) => {
    try {
        const user = await storage.getUser((req as any).user!.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            username: user.username,
            role: user.role,
            tenantId: user.tenantId,
            createdAt: user.createdAt,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

/**
 * Verify token - Cross-app token validation endpoint
 * Used by other CredVerse apps to validate tokens from this app
 */
router.post('/auth/verify-token', (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ valid: false, error: 'Token required' });
        }

        const payload = verifyAccessToken(token);

        if (!payload) {
            return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
        }

        res.json({
            valid: true,
            user: {
                userId: payload.userId,
                username: payload.username,
                role: payload.role,
            },
            app: 'issuer',
        });
    } catch (error) {
        res.status(500).json({ valid: false, error: 'Token verification failed' });
    }
});

export default router;
