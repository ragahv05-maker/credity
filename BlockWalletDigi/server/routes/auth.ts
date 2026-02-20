import { Router } from 'express';
import { z } from 'zod';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from '../storage';
import { generateOtp, verifyOtp, sendEmailOtp, sendSmsOtp } from '../services/otp-service';
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
    validatePasswordStrength,
    getSessionPolicyEvidence,
    AuthUser,
} from '../services/auth-service';
import {
    createAppleAuthState,
    getAppleAuthorizationUrl,
    verifyAppleIdentityToken,
} from '../services/apple-oauth-service';
import { hasPin, setupPin, verifyPin } from '../services/pin-auth-service';

const router = Router();
const allowLegacyLoginBypass =
    process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEMO_ROUTES === 'true';

/**
 * Register a new user
 */
router.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password, name } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                error: 'Password does not meet security requirements',
                details: passwordValidation.errors,
            });
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

        // Hash password and create user
        const passwordHash = await hashPassword(password);
        const user = await storage.createUser({
            username,
            name: name || username,
            email,
            password: passwordHash,
        });

        // Store device fingerprint for anti-bot / multi-account detection (PRD §7.2)
        if (req.deviceFingerprint) {
            await storage.storeDeviceFingerprint(
                user.id,
                req.deviceFingerprint,
                (req.headers['x-forwarded-for'] as string | undefined) ?? req.socket?.remoteAddress,
                req.headers['user-agent'],
            );
        }

        // Generate tokens
        const authUser: AuthUser = {
            id: user.id,
            username: user.username,
            email: user.email || undefined,
            role: 'holder',
        };

        const accessToken = generateAccessToken(authUser);
        const refreshToken = generateRefreshToken(authUser);

        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
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
        const passwordHash = (user as any).password;
        if (!passwordHash) {
            if (!allowLegacyLoginBypass) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            console.warn('[Auth] Allowing legacy no-password login because ALLOW_DEMO_ROUTES=true');
        } else {
            const valid = await comparePassword(password, passwordHash);
            if (!valid) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }

        // Generate tokens
        const authUser: AuthUser = {
            id: user.id,
            username: user.username,
            email: user.email || undefined,
            role: 'holder',
        };

        const accessToken = generateAccessToken(authUser);
        const refreshToken = generateRefreshToken(authUser);

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                did: user.did,
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
router.post('/auth/logout', authMiddleware, (req, res) => {
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
router.get('/auth/me', authMiddleware, async (req, res) => {
    try {
        const user = await storage.getUser(Number(req.user!.userId));
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            did: user.did,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

/**
 * Update user profile
 */
router.patch('/auth/me', authMiddleware, async (req, res) => {
    try {
        const { name, email, bio, avatarUrl } = req.body;

        const updated = await storage.updateUser(Number(req.user!.userId), {
            name,
            email,
            bio,
            avatarUrl,
        });

        res.json({
            success: true,
            user: {
                id: updated.id,
                username: updated.username,
                name: updated.name,
                email: updated.email,
                bio: updated.bio,
                avatarUrl: updated.avatarUrl,
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * Change password
 */
router.post('/auth/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ error: 'newPassword is required' });
        }

        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                error: 'Password does not meet security requirements',
                details: passwordValidation.errors,
            });
        }

        const user = await storage.getUser(Number(req.user!.userId));
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password if exists
        const passwordHash = (user as any).password;
        if (passwordHash && currentPassword) {
            const valid = await comparePassword(currentPassword, passwordHash);
            if (!valid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
        }

        // Update password
        const newHash = await hashPassword(newPassword);
        await storage.updateUser(Number(req.user!.userId), { password: newHash } as any);

        res.json({ success: true, message: 'Password updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to change password' });
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
            app: 'wallet',
        });
    } catch (error) {
        res.status(500).json({ valid: false, error: 'Token verification failed' });
    }
});

// ─── Apple OAuth ──────────────────────────────────────────────────────────
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const appleStateCache = new Set<string>();

router.get('/auth/apple', (_req, res) => {
    if (!APPLE_CLIENT_ID) {
        return res.status(503).json({ error: 'Apple OAuth not configured' });
    }

    const state = createAppleAuthState();
    appleStateCache.add(state);

    try {
        const authorizationUrl = getAppleAuthorizationUrl(state);
        res.json({ authorizationUrl, state });
    } catch (error: any) {
        res.status(503).json({ error: error.message });
    }
});

router.post('/auth/apple', async (req, res) => {
    try {
        if (!APPLE_CLIENT_ID) {
            return res.status(503).json({ error: 'Apple OAuth not configured' });
        }

        const { identityToken, state } = req.body;
        if (!identityToken) {
            return res.status(400).json({ error: 'identityToken required' });
        }

        if (state && !appleStateCache.has(state)) {
            return res.status(400).json({ error: 'Invalid OAuth state' });
        }

        if (state) appleStateCache.delete(state);

        const payload = verifyAppleIdentityToken(identityToken);
        const email = payload.email ?? `apple_${payload.sub}@privaterelay.appleid.com`;

        let user = await storage.getUserByEmail(email);
        if (!user) {
            const hashed = await hashPassword(String(Math.random()));
            user = await storage.createUser({
                username: email,
                email,
                password: hashed,
                name: email,
                emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
            });
        }

        const authUser: AuthUser = {
            id: user.id,
            username: user.username,
            email: user.email || undefined,
            role: 'holder',
        };

        const accessToken = generateAccessToken(authUser);
        const refreshToken = generateRefreshToken(authUser);

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name,
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: 900,
            },
        });
    } catch (error: any) {
        res.status(401).json({ error: error.message ?? 'Apple sign-in failed' });
    }
});

router.get('/auth/apple/callback', (req, res) => {
    const { code, id_token: idToken, state } = req.query;
    if (!code && !idToken) {
        return res.status(400).json({ error: 'Apple callback missing code or id_token' });
    }

    res.json({
        success: true,
        code: code ?? null,
        idTokenReceived: Boolean(idToken),
        state: state ?? null,
        hint: 'Submit identityToken to POST /api/v1/auth/apple to complete authentication',
    });
});

// ─── Google OAuth ─────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:5000/api/auth/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy(
        { clientID: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, callbackURL: GOOGLE_CALLBACK_URL },
        (_accessToken: string, _refreshToken: string, profile: import('passport-google-oauth20').Profile, done: (err: null, user: import('passport-google-oauth20').Profile) => void) => done(null, profile),
    ));
}

router.get('/auth/google', (req, res, next) => {
    if (!GOOGLE_CLIENT_ID) {
        return res.status(503).json({ error: 'Google OAuth not configured' });
    }
    passport.authenticate('google', { session: false, scope: ['email', 'profile'] })(req, res, next);
});

router.get('/auth/google/callback',
    (req, res, next) => {
        if (!GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google OAuth not configured' });
        passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/?error=oauth_failed` })(req, res, next);
    },
    async (req, res) => {
        try {
            const profile = req.user as unknown as import('passport-google-oauth20').Profile;
            const email = profile.emails?.[0]?.value;
            if (!email) return res.redirect(`${FRONTEND_URL}/?error=no_email`);

            let user = await storage.getUserByEmail(email);
            if (!user) {
                const hashed = await hashPassword(String(Math.random()));
                user = await storage.createUser({
                    username: email,
                    email,
                    password: hashed,
                    name: profile.displayName ?? email,
                    did: null,
                    bio: null,
                    avatarUrl: profile.photos?.[0]?.value ?? null,
                    phoneNumber: null,
                    phoneVerified: false,
                    emailVerified: true,
                });
            }
            const accessToken = generateAccessToken({ id: user.id, username: user.username, role: 'holder' });
            const refreshToken = generateRefreshToken({ id: user.id, username: user.username, role: 'holder' });
            res.redirect(`${FRONTEND_URL}/?token=${accessToken}&refresh=${refreshToken}`);
        } catch (err) {
            res.redirect(`${FRONTEND_URL}/?error=oauth_error`);
        }
    },
);

// ─── OTP Routes ────────────────────────────────────────────────────────────

router.post('/auth/send-email-otp', async (req, res) => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Valid email required' });
    try {
        const user = await storage.getUserByEmail(parsed.data.email);
        const code = await generateOtp(parsed.data.email, 'email_verify', user?.id);
        await sendEmailOtp(parsed.data.email, code);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(429).json({ error: err.message });
    }
});

router.post('/auth/verify-email-otp', async (req, res) => {
    const schema = z.object({ email: z.string().email(), code: z.string().length(6) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'email and 6-digit code required' });
    try {
        await verifyOtp(parsed.data.email, 'email_verify', parsed.data.code);
        // Mark emailVerified on user if exists
        const user = await storage.getUserByEmail(parsed.data.email);
        if (user) await storage.updateUser(user.id, { emailVerified: true });
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/auth/send-phone-otp', async (req, res) => {
    const schema = z.object({ phone: z.string().min(7) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Valid phone number required' });
    try {
        const code = await generateOtp(parsed.data.phone, 'phone_verify');
        await sendSmsOtp(parsed.data.phone, code);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(429).json({ error: err.message });
    }
});

router.post('/auth/verify-phone-otp', async (req, res) => {
    const schema = z.object({ phone: z.string().min(7), code: z.string().length(6) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'phone and 6-digit code required' });
    try {
        await verifyOtp(parsed.data.phone, 'phone_verify', parsed.data.code);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/auth/forgot-password', async (req, res) => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Valid email required' });
    // Always respond 200 to prevent email enumeration
    try {
        const user = await storage.getUserByEmail(parsed.data.email);
        if (user) {
            const code = await generateOtp(parsed.data.email, 'password_reset', user.id);
            await sendEmailOtp(parsed.data.email, code);
        }
    } catch { /* swallow */ }
    res.json({ ok: true });
});

router.post('/auth/reset-password', async (req, res) => {
    const schema = z.object({
        email: z.string().email(),
        code: z.string().length(6),
        newPassword: z.string().min(8),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'email, 6-digit code, and newPassword (min 8 chars) required' });
    try {
        const strength = validatePasswordStrength(parsed.data.newPassword);
        if (!strength.isValid) return res.status(400).json({ error: strength.errors.join('; ') });
        await verifyOtp(parsed.data.email, 'password_reset', parsed.data.code);
        const user = await storage.getUserByEmail(parsed.data.email);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const hashed = await hashPassword(parsed.data.newPassword);
        await storage.updateUser(user.id, { password: hashed });
        res.json({ ok: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/auth/pin/setup', authMiddleware, async (req, res) => {
    try {
        const schema = z.object({ pin: z.string().regex(/^[0-9]{4,8}$/) });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'pin must be numeric and 4-8 digits' });
        }

        await setupPin(Number(req.user!.userId), parsed.data.pin);
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/auth/pin/verify', async (req, res) => {
    try {
        const schema = z.object({ username: z.string().min(1), pin: z.string().regex(/^[0-9]{4,8}$/) });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'username and valid pin are required' });
        }

        const user = await storage.getUserByUsername(parsed.data.username);
        if (!user || !hasPin(user.id)) {
            return res.status(401).json({ error: 'PIN fallback unavailable for this user' });
        }

        const valid = await verifyPin(user.id, parsed.data.pin);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        const authUser: AuthUser = { id: user.id, username: user.username, email: user.email || undefined, role: 'holder' };
        const accessToken = generateAccessToken(authUser);
        const refreshToken = generateRefreshToken(authUser);

        res.json({
            success: true,
            fallback: 'pin',
            tokens: { accessToken, refreshToken, expiresIn: 900 },
        });
    } catch (error) {
        res.status(500).json({ error: 'PIN verification failed' });
    }
});

router.post('/auth/session/policy-evidence', (req, res) => {
    const schema = z.object({ refreshToken: z.string().min(10) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'refreshToken is required' });
    }

    const evidence = getSessionPolicyEvidence(parsed.data.refreshToken);
    if (!evidence) {
        return res.status(404).json({ error: 'Session evidence unavailable' });
    }

    res.json({
        success: true,
        policy: '30-day-session-max',
        ...evidence,
    });
});

export default router;
