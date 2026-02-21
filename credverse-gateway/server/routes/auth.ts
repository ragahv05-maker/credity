import { Router } from 'express';
import crypto from 'crypto';
import IORedis from 'ioredis';
import {
    initAuth,
    generateAccessToken,
    verifyAccessToken,
    type AuthUser
} from '@credverse/shared-auth';
import {
    getAuthorizationUrl,
    exchangeCodeForTokens,
    getGoogleUserInfo,
    isGoogleOAuthConfigured,
    type GoogleUser,
} from '../services/google';

const router = Router();
const requireStrictSecrets =
    process.env.NODE_ENV === 'production' || process.env.REQUIRE_DATABASE === 'true';
const gatewayJwtSecret = process.env.JWT_SECRET
    || (requireStrictSecrets ? '' : 'dev-only-secret-not-for-production');
const gatewayJwtRefreshSecret = process.env.JWT_REFRESH_SECRET
    || (requireStrictSecrets ? '' : 'dev-only-refresh-secret-not-for-production');

if (requireStrictSecrets && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
    throw new Error('Gateway auth requires JWT_SECRET and JWT_REFRESH_SECRET in strict mode.');
}

const requirePersistentSessionStore =
    process.env.NODE_ENV === 'production' || process.env.REQUIRE_DATABASE === 'true';
const redisUrl = process.env.REDIS_URL;
if (requirePersistentSessionStore && !redisUrl) {
    throw new Error('Gateway auth requires REDIS_URL for session/state persistence in strict mode.');
}

// Initialize shared auth
initAuth({
    jwtSecret: gatewayJwtSecret,
    jwtRefreshSecret: gatewayJwtRefreshSecret,
    app: 'gateway'
});

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const STATE_TTL_SECONDS = 10 * 60;

type SessionRecord = {
    user: GoogleUser;
    jwtToken: string;
    createdAt: string;
};

class GatewaySessionStore {
    private readonly redis?: IORedis;
    private readonly sessions = new Map<string, SessionRecord>();
    private readonly pendingStates = new Map<string, { createdAt: Date }>();

    constructor(url?: string) {
        if (!url) {
            return;
        }

        this.redis = new IORedis(url, {
            maxRetriesPerRequest: 1,
            enableReadyCheck: true,
            lazyConnect: false,
        });

        this.redis.on('error', (error) => {
            console.error('[Auth] Redis session store error:', error);
        });
    }

    private prunePendingStates(): void {
        const expiredBefore = Date.now() - STATE_TTL_SECONDS * 1000;
        for (const [key, value] of this.pendingStates.entries()) {
            if (value.createdAt.getTime() < expiredBefore) {
                this.pendingStates.delete(key);
            }
        }
    }

    private pruneSessions(): void {
        const expiredBefore = Date.now() - SESSION_TTL_SECONDS * 1000;
        for (const [key, value] of this.sessions.entries()) {
            const createdAtMs = Date.parse(value.createdAt);
            if (Number.isFinite(createdAtMs) && createdAtMs < expiredBefore) {
                this.sessions.delete(key);
            }
        }
    }

    async setPendingState(state: string): Promise<void> {
        if (this.redis) {
            await this.redis.set(`gateway:auth:state:${state}`, '1', 'EX', STATE_TTL_SECONDS);
            return;
        }

        this.pendingStates.set(state, { createdAt: new Date() });
        this.prunePendingStates();
    }

    async consumePendingState(state: string): Promise<boolean> {
        if (this.redis) {
            const key = `gateway:auth:state:${state}`;
            const exists = await this.redis.get(key);
            if (!exists) return false;
            await this.redis.del(key);
            return true;
        }

        this.prunePendingStates();
        if (!this.pendingStates.has(state)) {
            return false;
        }
        this.pendingStates.delete(state);
        return true;
    }

    async setSession(sessionId: string, session: SessionRecord): Promise<void> {
        if (this.redis) {
            await this.redis.set(
                `gateway:auth:session:${sessionId}`,
                JSON.stringify(session),
                'EX',
                SESSION_TTL_SECONDS,
            );
            return;
        }

        this.sessions.set(sessionId, session);
        this.pruneSessions();
    }

    async getSession(sessionId: string): Promise<SessionRecord | null> {
        if (this.redis) {
            const raw = await this.redis.get(`gateway:auth:session:${sessionId}`);
            if (!raw) return null;
            try {
                return JSON.parse(raw) as SessionRecord;
            } catch {
                return null;
            }
        }

        this.pruneSessions();
        return this.sessions.get(sessionId) ?? null;
    }

    async deleteSession(sessionId: string): Promise<void> {
        if (this.redis) {
            await this.redis.del(`gateway:auth:session:${sessionId}`);
            return;
        }

        this.sessions.delete(sessionId);
    }
}

const sessionStore = new GatewaySessionStore(redisUrl);

/**
 * Generate JWT for cross-app SSO
 */
function generateSSOToken(user: GoogleUser): string {
    const authUser: AuthUser = {
        id: user.id,
        username: user.email,
        role: 'user'
    };
    return generateAccessToken(authUser);
}

/**
 * Verify SSO token
 */
async function verifySSOToken(token: string): Promise<Record<string, unknown> | null> {
    const decoded = await verifyAccessToken(token);
    if (!decoded || typeof decoded !== 'object') {
        return null;
    }
    return decoded as Record<string, unknown>;
}

/**
 * Check if Google OAuth is available
 */
router.get('/auth/status', (_req, res) => {
    res.json({
        googleOAuth: isGoogleOAuthConfigured(),
        sso: true,
        message: isGoogleOAuthConfigured()
            ? 'Google OAuth is configured with SSO'
            : 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
    });
});

/**
 * Start Google OAuth flow
 */
router.get('/auth/google', async (_req, res) => {
    if (!isGoogleOAuthConfigured()) {
        return res.status(503).json({ error: 'Google OAuth not configured' });
    }

    const state = crypto.randomBytes(32).toString('hex');
    await sessionStore.setPendingState(state);

    const authUrl = getAuthorizationUrl(state);
    res.redirect(authUrl);
});

/**
 * Handle Google OAuth callback
 */
router.get('/auth/google/callback', async (req, res) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            return res.redirect(`/?error=${encodeURIComponent(error as string)}`);
        }

        if (!code || !state) {
            return res.redirect('/?error=invalid_request');
        }

        const validState = await sessionStore.consumePendingState(state as string);
        if (!validState) {
            return res.redirect('/?error=invalid_state');
        }

        const tokens = await exchangeCodeForTokens(code as string);
        const googleUser = await getGoogleUserInfo(tokens.accessToken);
        const jwtToken = generateSSOToken(googleUser);

        const sessionId = crypto.randomBytes(32).toString('hex');
        await sessionStore.setSession(sessionId, {
            user: googleUser,
            jwtToken,
            createdAt: new Date().toISOString(),
        });

        res.cookie('session', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_TTL_SECONDS * 1000,
        });

        res.cookie('sso_token', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_TTL_SECONDS * 1000,
        });

        res.redirect(`/?login=success&name=${encodeURIComponent(googleUser.name)}`);
    } catch (error) {
        console.error('[Auth] Google callback error:', error);
        res.redirect('/?error=auth_failed');
    }
});

/**
 * Get current user and SSO token
 */
router.get('/auth/me', async (req, res) => {
    const sessionId = req.cookies?.session;

    if (!sessionId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const session = await sessionStore.getSession(sessionId);
    if (!session) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
        user: session.user,
        ssoToken: session.jwtToken,
        authenticated: true,
    });
});

/**
 * Verify SSO token - used by other apps for cross-app auth
 */
router.post('/auth/verify-token', async (req, res) => {
    let token = req.body?.token;

    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        }
    }

    if (!token) {
        return res.json({ valid: false, error: 'No token provided' });
    }

    const decoded = await verifySSOToken(token);
    if (decoded) {
        res.json({
            valid: true,
            user: {
                id: typeof decoded.sub === 'string' ? decoded.sub : null,
                email: typeof decoded.email === 'string' ? decoded.email : null,
                name: typeof decoded.name === 'string' ? decoded.name : null,
                picture: typeof decoded.picture === 'string' ? decoded.picture : null,
            },
            app: 'gateway',
        });
    } else {
        res.json({ valid: false, error: 'Invalid or expired token' });
    }
});

/**
 * Logout
 */
router.post('/auth/logout', async (req, res) => {
    const sessionId = req.cookies?.session;
    if (sessionId) {
        await sessionStore.deleteSession(sessionId);
    }
    res.clearCookie('session');
    res.clearCookie('sso_token');
    res.json({ success: true });
});

export default router;
