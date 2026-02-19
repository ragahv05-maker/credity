import { Router } from 'express';
import { authMiddleware } from '../services/auth-service';
import {
    generateTwoFactorSetup,
    verifyAndEnable,
    verifyToken,
    isTwoFactorEnabled,
    disableTwoFactor,
    regenerateBackupCodes,
    getTwoFactorStatus,
} from '../services/two-factor';
import { storage } from '../storage';
import { pendingTwoFactorTokens } from './auth';

const router = Router();

/**
 * Get 2FA status for current user
 */
router.get('/2fa/status', authMiddleware, async (req, res) => {
    try {
        const userId = String(req.user!.userId);
        const status = getTwoFactorStatus(userId);

        res.json({
            enabled: status.enabled,
            backupCodesRemaining: status.backupCodesRemaining,
        });
    } catch (error) {
        console.error('[2FA] Status check error:', error);
        res.status(500).json({ error: 'Failed to get 2FA status' });
    }
});

/**
 * Begin 2FA setup - generates secret and QR code
 */
router.post('/2fa/setup', authMiddleware, async (req, res) => {
    try {
        const userId = String(req.user!.userId);
        const user = await storage.getUser(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if already enabled
        if (isTwoFactorEnabled(userId)) {
            return res.status(400).json({ error: '2FA is already enabled' });
        }

        const email = (user as any).email || user.username;
        const setup = await generateTwoFactorSetup(userId, email);

        res.json({
            success: true,
            qrCodeDataUrl: setup.qrCodeDataUrl,
            secret: setup.secret, // For manual entry
            message: 'Scan the QR code with your authenticator app, then verify with a code',
        });
    } catch (error) {
        console.error('[2FA] Setup error:', error);
        res.status(500).json({ error: 'Failed to generate 2FA setup' });
    }
});

/**
 * Verify and enable 2FA
 */
router.post('/2fa/enable', authMiddleware, async (req, res) => {
    try {
        const userId = String(req.user!.userId);
        const { token } = req.body;

        if (!token || token.length !== 6) {
            return res.status(400).json({ error: 'Please enter a valid 6-digit code' });
        }

        const result = verifyAndEnable(userId, token);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({
            success: true,
            message: '2FA has been enabled for your account',
            backupCodes: result.backupCodes,
            warning: 'Save these backup codes in a secure place. Each can only be used once.',
        });
    } catch (error) {
        console.error('[2FA] Enable error:', error);
        res.status(500).json({ error: 'Failed to enable 2FA' });
    }
});

/**
 * Verify 2FA token (for login flow)
 * This is called after initial password authentication
 */
router.post('/2fa/verify', async (req, res) => {
    try {
        const { userId, token, pendingToken } = req.body;
        const normalizedUserId = String(userId);

        if (!userId || !token) {
            return res.status(400).json({ error: 'User ID and token are required' });
        }

        // Verify pending token (temporary token from initial login)
        if (!pendingToken) {
            return res.status(400).json({ error: 'Pending authentication token required' });
        }

        const pendingRecord = pendingTwoFactorTokens.get(pendingToken);
        if (!pendingRecord) {
            return res.status(401).json({ error: 'Invalid pending authentication token' });
        }
        if (pendingRecord.expiresAt.getTime() < Date.now()) {
            pendingTwoFactorTokens.delete(pendingToken);
            return res.status(401).json({ error: 'Pending authentication token expired' });
        }
        if (String(pendingRecord.userId) !== normalizedUserId) {
            return res.status(401).json({ error: 'Pending authentication token mismatch' });
        }

        const result = verifyToken(normalizedUserId, token);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        // Consume pending token to prevent replay
        pendingTwoFactorTokens.delete(pendingToken);

        // Generate full access tokens
        const { generateAccessToken, generateRefreshToken } = await import('../services/auth-service');
        const user = await storage.getUser(normalizedUserId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const authUser = {
            id: user.id,
            username: user.username,
            role: user.role as 'admin' | 'issuer' | 'user',
        };

        const accessToken = generateAccessToken(authUser);
        const refreshToken = generateRefreshToken(authUser);

        res.json({
            success: true,
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
    } catch (error) {
        console.error('[2FA] Verify error:', error);
        res.status(500).json({ error: 'Failed to verify 2FA' });
    }
});

/**
 * Disable 2FA (requires current password)
 */
router.post('/2fa/disable', authMiddleware, async (req, res) => {
    try {
        const userId = String(req.user!.userId);
        const { password, token } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password is required to disable 2FA' });
        }

        // Verify password
        const user = await storage.getUser(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { comparePassword } = await import('../services/auth-service');
        const validPassword = await comparePassword(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Optionally verify 2FA token
        if (token) {
            const tokenResult = verifyToken(userId, token);
            if (!tokenResult.success) {
                return res.status(400).json({ error: tokenResult.error });
            }
        }

        const disabled = disableTwoFactor(userId);

        if (!disabled) {
            return res.status(400).json({ error: '2FA is not enabled' });
        }

        res.json({
            success: true,
            message: '2FA has been disabled for your account',
        });
    } catch (error) {
        console.error('[2FA] Disable error:', error);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
});

/**
 * Regenerate backup codes
 */
router.post('/2fa/backup-codes/regenerate', authMiddleware, async (req, res) => {
    try {
        const userId = String(req.user!.userId);
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: '2FA token required to regenerate backup codes' });
        }

        // Verify current 2FA token
        const verifyResult = verifyToken(userId, token);
        if (!verifyResult.success) {
            return res.status(400).json({ error: verifyResult.error });
        }

        const backupCodes = regenerateBackupCodes(userId);

        if (!backupCodes) {
            return res.status(400).json({ error: '2FA is not enabled' });
        }

        res.json({
            success: true,
            backupCodes,
            warning: 'Old backup codes are now invalid. Save these new codes in a secure place.',
        });
    } catch (error) {
        console.error('[2FA] Regenerate backup codes error:', error);
        res.status(500).json({ error: 'Failed to regenerate backup codes' });
    }
});

export default router;
