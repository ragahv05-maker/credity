/**
 * Platform Connections API Routes
 * Manages platform OAuth connection scaffolding and persisted connection states.
 */

import { Router, type Request, type Response } from 'express';
import { and, desc, eq, ne } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import crypto from 'crypto';
import { platformConnections } from '@shared/schema';
import { authMiddleware } from '../services/auth-service';
import { getAuthenticatedUserId } from '../utils/authz';
import { encrypt } from '../services/crypto-utils';

const router = Router();

const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : null;
const db = pool ? drizzle(pool) : null;

type PlatformStatus = 'active' | 'pending' | 'revoked' | 'expired';

interface PlatformConnectionResponse {
    id: string;
    platformId: string;
    platformName: string;
    platformLogo?: string;
    status: PlatformStatus;
    sharedCredentials: string[];
    permissions: {
        shareIdentity: boolean;
        shareCredentials: boolean;
        shareActivity: boolean;
    };
    connectedAt: Date;
    lastAccessedAt: Date | null;
    expiresAt: Date | null;
    accessCount: number;
}

interface ConnectionRequestResponse {
    id: string;
    platformId: string;
    platformName: string;
    requestedCredentials: string[];
    requestedPermissions: string[];
    status: 'pending' | 'approved' | 'denied' | 'expired';
    createdAt: Date;
    expiresAt: Date;
}

const DEFAULT_PERMISSIONS = {
    shareIdentity: true,
    shareCredentials: true,
    shareActivity: false,
};

const PLATFORM_OAUTH_STUBS = new Set(['uber', 'linkedin', 'swiggy', 'tinder']);

// Per-platform OAuth2 configuration
const PLATFORM_OAUTH_CONFIG: Record<string, {
    authUrl: string;
    tokenUrl: string;
    scopes: string;
    clientIdEnv: string;
    clientSecretEnv: string;
    name: string;
}> = {
    linkedin: {
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        scopes: 'r_liteprofile r_emailaddress',
        clientIdEnv: 'LINKEDIN_CLIENT_ID',
        clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
        name: 'LinkedIn',
    },
    uber: {
        authUrl: 'https://login.uber.com/oauth/v2/authorize',
        tokenUrl: 'https://login.uber.com/oauth/v2/token',
        scopes: 'profile history',
        clientIdEnv: 'UBER_CLIENT_ID',
        clientSecretEnv: 'UBER_CLIENT_SECRET',
        name: 'Uber',
    },
    swiggy: {
        // Swiggy has no public OAuth partner API — show as not available
        authUrl: '',
        tokenUrl: '',
        scopes: '',
        clientIdEnv: 'SWIGGY_CLIENT_ID',
        clientSecretEnv: 'SWIGGY_CLIENT_SECRET',
        name: 'Swiggy',
    },
    tinder: {
        authUrl: '',
        tokenUrl: '',
        scopes: '',
        clientIdEnv: 'TINDER_CLIENT_ID',
        clientSecretEnv: 'TINDER_CLIENT_SECRET',
        name: 'Tinder',
    },
};

// Short-lived in-memory state token store (userId → { state, platform, expiresAt })
const oauthStateStore = new Map<string, { userId: number; platform: string; expiresAt: number }>();

function cleanExpiredStates(): void {
    const now = Date.now();
    for (const [state, entry] of oauthStateStore.entries()) {
        if (entry.expiresAt < now) oauthStateStore.delete(state);
    }
}

function getOAuthEncryptionKey(): string {
    const key = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
    if (key && key.length === 64) return key;
    // Fall back to SHA-256 of JWT_SECRET so tokens are still protected
    const secret = process.env.JWT_SECRET || 'default_jwt_secret_change_in_production';
    return crypto.createHash('sha256').update(secret).digest('hex');
}

function normalizeStatus(status: string | null): PlatformStatus {
    if (status === 'active' || status === 'pending' || status === 'revoked' || status === 'expired') {
        return status;
    }
    return 'pending';
}

function parseScopes(scopes: string | null): string[] {
    if (!scopes || scopes.trim().length === 0) return [];

    try {
        const parsed = JSON.parse(scopes);
        if (Array.isArray(parsed)) {
            return parsed.map((value) => String(value).trim()).filter(Boolean);
        }
    } catch {
        // Continue to text parsing.
    }

    return scopes
        .split(/[,\s]+/)
        .map((value) => value.trim())
        .filter(Boolean);
}

function mapConnection(row: typeof platformConnections.$inferSelect): PlatformConnectionResponse {
    return {
        id: String(row.id),
        platformId: row.platformId,
        platformName: row.platformName,
        status: normalizeStatus(row.status),
        sharedCredentials: parseScopes(row.scopes),
        permissions: DEFAULT_PERMISSIONS,
        connectedAt: row.connectedAt ?? row.createdAt ?? new Date(),
        lastAccessedAt: row.lastSyncedAt ?? null,
        expiresAt: null,
        accessCount: 0,
    };
}

function mapPendingRequest(row: typeof platformConnections.$inferSelect): ConnectionRequestResponse {
    const createdAt = row.createdAt ?? new Date();

    return {
        id: String(row.id),
        platformId: row.platformId,
        platformName: row.platformName,
        requestedCredentials: parseScopes(row.scopes),
        requestedPermissions: ['identity', 'credentials'],
        status: row.status === 'pending' ? 'pending' : 'approved',
        createdAt,
        expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
    };
}

function parseConnectionId(rawId: string): number | null {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
}

async function listConnectionsForUser(userId: number): Promise<PlatformConnectionResponse[]> {
    if (!db) return [];

    const rows = await db
        .select()
        .from(platformConnections)
        .where(
            and(
                eq(platformConnections.userId, userId),
                ne(platformConnections.status, 'revoked'),
            ),
        )
        .orderBy(desc(platformConnections.createdAt));

    return rows.map((row) => mapConnection(row));
}

async function listPendingRequestsForUser(userId: number): Promise<ConnectionRequestResponse[]> {
    if (!db) return [];

    const rows = await db
        .select()
        .from(platformConnections)
        .where(
            and(
                eq(platformConnections.userId, userId),
                eq(platformConnections.status, 'pending'),
            ),
        )
        .orderBy(desc(platformConnections.createdAt));

    return rows.map((row) => mapPendingRequest(row));
}

async function updateConnectionStatus(
    userId: number,
    rawConnectionId: string,
    status: 'active' | 'revoked',
): Promise<typeof platformConnections.$inferSelect | null> {
    if (!db) return null;

    const connectionId = parseConnectionId(rawConnectionId);
    if (!connectionId) return null;

    const nextValues = status === 'active'
        ? {
            status,
            connectedAt: new Date(),
            lastSyncedAt: new Date(),
        }
        : {
            status,
            lastSyncedAt: new Date(),
        };

    const [updated] = await db
        .update(platformConnections)
        .set(nextValues)
        .where(
            and(
                eq(platformConnections.id, connectionId),
                eq(platformConnections.userId, userId),
            ),
        )
        .returning();

    return updated ?? null;
}

async function handleApproveConnection(req: Request, res: Response): Promise<void> {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const updated = await updateConnectionStatus(userId, req.params.id, 'active');
        if (!updated) {
            res.status(404).json({
                success: false,
                error: 'Connection not found',
            });
            return;
        }

        res.json({
            success: true,
            connection: mapConnection(updated),
            message: `Connected to ${updated.platformName}`,
        });
    } catch (error: any) {
        console.error('Approve connection error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve connection',
        });
    }
}

async function handleListPending(req: Request, res: Response): Promise<void> {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const requests = await listPendingRequestsForUser(userId);
        res.json({
            success: true,
            requests,
            pendingCount: requests.length,
        });
    } catch (error: any) {
        console.error('Pending connections list error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list pending connections',
        });
    }
}

/**
 * GET /api/connections
 * List all platform connections.
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const connections = await listConnectionsForUser(userId);
        const activeCount = connections.filter((connection) => connection.status === 'active').length;

        res.json({
            success: true,
            connections,
            stats: {
                total: connections.length,
                active: activeCount,
                totalAccessCount: connections.reduce((sum, connection) => sum + connection.accessCount, 0),
            },
        });
    } catch (error: any) {
        console.error('Connections list error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list connections',
        });
    }
});

/**
 * GET /api/connections/pending
 * List pending connection requests.
 */
router.get('/pending', authMiddleware, handleListPending);

/**
 * Legacy compatibility alias for existing clients.
 * GET /api/connections/requests
 */
router.get('/requests', authMiddleware, handleListPending);

/**
 * POST /api/connections/:id/approve
 * Approve a pending connection.
 */
router.post('/:id/approve', authMiddleware, async (req: Request, res: Response) => {
    await handleApproveConnection(req, res);
});

/**
 * Legacy compatibility alias for existing clients.
 * POST /api/connections/requests/:id/approve
 */
router.post('/requests/:id/approve', authMiddleware, async (req: Request, res: Response) => {
    await handleApproveConnection(req, res);
});

/**
 * POST /api/connections/requests/:id/deny
 * Legacy compatibility route for denying pending requests.
 */
router.post('/requests/:id/deny', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const updated = await updateConnectionStatus(userId, req.params.id, 'revoked');
        if (!updated) {
            return res.status(404).json({
                success: false,
                error: 'Request not found',
            });
        }

        res.json({
            success: true,
            message: `Denied request from ${updated.platformName}`,
        });
    } catch (error: any) {
        console.error('Deny request error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to deny request',
        });
    }
});

/**
 * DELETE /api/connections/:id
 * Disconnect/revoke a platform connection.
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const updated = await updateConnectionStatus(userId, req.params.id, 'revoked');
        if (!updated) {
            return res.status(404).json({
                success: false,
                error: 'Connection not found',
            });
        }

        res.json({
            success: true,
            message: `Disconnected from ${updated.platformName}`,
        });
    } catch (error: any) {
        console.error('Disconnect error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to disconnect',
        });
    }
});

/**
 * GET /api/connections/oauth/:platform/start
 * Initiate OAuth flow for a supported platform.
 * Returns { configured: false } when platform credentials are not set.
 */
router.get('/oauth/:platform/start', authMiddleware, async (req: Request, res: Response) => {
    const platform = String(req.params.platform || '').toLowerCase();
    if (!PLATFORM_OAUTH_STUBS.has(platform)) {
        return res.status(400).json({ error: 'Unsupported platform', platform });
    }

    const config = PLATFORM_OAUTH_CONFIG[platform];
    const clientId = config ? process.env[config.clientIdEnv] : undefined;

    if (!config || !config.authUrl || !clientId) {
        return res.json({ configured: false, platform, message: 'Platform credentials not configured' });
    }

    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    cleanExpiredStates();

    // Generate replay-safe state token
    const state = crypto.randomBytes(32).toString('hex');
    oauthStateStore.set(state, { userId, platform, expiresAt: Date.now() + 10 * 60 * 1000 });

    const redirectUri = process.env.OAUTH_CALLBACK_BASE_URL
        ? `${process.env.OAUTH_CALLBACK_BASE_URL}/api/connections/oauth/${platform}/callback`
        : `${req.protocol}://${req.get('host')}/api/connections/oauth/${platform}/callback`;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: config.scopes,
        state,
        response_type: 'code',
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;

    res.json({ configured: true, authUrl, state, platform });
});

/**
 * GET /api/connections/oauth/:platform/callback
 * OAuth callback — exchanges code for access token and stores the connection.
 */
router.get('/oauth/:platform/callback', async (req: Request, res: Response) => {
    const platform = String(req.params.platform || '').toLowerCase();
    const { code, state, error: oauthError } = req.query as Record<string, string>;

    if (oauthError) {
        return res.status(400).json({ success: false, error: 'oauth_denied', reason: oauthError });
    }

    if (!state || !code) {
        return res.status(400).json({ success: false, error: 'missing_code_or_state' });
    }

    cleanExpiredStates();
    const stateEntry = oauthStateStore.get(state);

    if (!stateEntry || stateEntry.expiresAt < Date.now() || stateEntry.platform !== platform) {
        return res.status(400).json({ success: false, error: 'invalid_or_expired_state' });
    }

    // One-time use — remove state immediately to prevent replay
    oauthStateStore.delete(state);

    const config = PLATFORM_OAUTH_CONFIG[platform];
    const clientId = config ? process.env[config.clientIdEnv] : undefined;
    const clientSecret = config ? process.env[config.clientSecretEnv] : undefined;

    if (!config || !clientId || !clientSecret) {
        return res.status(503).json({ success: false, error: 'platform_not_configured' });
    }

    const redirectUri = process.env.OAUTH_CALLBACK_BASE_URL
        ? `${process.env.OAUTH_CALLBACK_BASE_URL}/api/connections/oauth/${platform}/callback`
        : `${req.protocol}://${req.get('host')}/api/connections/oauth/${platform}/callback`;

    try {
        // Exchange authorization code for access token
        const tokenResp = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                client_secret: clientSecret,
            }).toString(),
        });

        if (!tokenResp.ok) {
            const body = await tokenResp.text();
            console.error(`[OAuth] Token exchange failed for ${platform}:`, body);
            return res.status(502).json({ success: false, error: 'token_exchange_failed' });
        }

        const tokenData = await tokenResp.json() as { access_token: string; refresh_token?: string; scope?: string };

        // Encrypt tokens at rest
        const encKey = getOAuthEncryptionKey();
        const encryptedAccess = encrypt(tokenData.access_token, encKey);
        const encryptedRefresh = tokenData.refresh_token ? encrypt(tokenData.refresh_token, encKey) : null;

        if (db) {
            // Upsert connection record
            const existing = await db.select().from(platformConnections).where(
                and(eq(platformConnections.userId, stateEntry.userId), eq(platformConnections.platformId, platform))
            ).limit(1);

            if (existing.length > 0) {
                await db.update(platformConnections).set({
                    status: 'active',
                    oauthAccessToken: JSON.stringify(encryptedAccess),
                    oauthRefreshToken: encryptedRefresh ? JSON.stringify(encryptedRefresh) : null,
                    scopes: tokenData.scope ?? config.scopes,
                    connectedAt: new Date(),
                    lastSyncedAt: new Date(),
                }).where(eq(platformConnections.id, existing[0].id));
            } else {
                await db.insert(platformConnections).values({
                    userId: stateEntry.userId,
                    platformId: platform,
                    platformName: config.name,
                    status: 'active',
                    oauthAccessToken: JSON.stringify(encryptedAccess),
                    oauthRefreshToken: encryptedRefresh ? JSON.stringify(encryptedRefresh) : null,
                    scopes: tokenData.scope ?? config.scopes,
                    connectedAt: new Date(),
                    lastSyncedAt: new Date(),
                });
            }
        }

        // Redirect to frontend success page or return JSON
        const frontendUrl = process.env.FRONTEND_URL || process.env.BLOCKWALLET_URL;
        if (frontendUrl) {
            return res.redirect(`${frontendUrl}/connections?connected=${platform}`);
        }

        res.json({ success: true, platform, connected: true });
    } catch (error: any) {
        console.error(`[OAuth] Callback error for ${platform}:`, error);
        res.status(500).json({ success: false, error: 'oauth_callback_failed' });
    }
});

/**
 * PUT /api/connections/:id/permissions
 * Preserve legacy response shape while platform OAuth permissions are scaffolded.
 */
router.put('/:id/permissions', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const connectionId = parseConnectionId(req.params.id);
        if (!connectionId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid connection id',
            });
        }

        if (!db) {
            return res.status(503).json({
                success: false,
                error: 'Database is required for connection permissions',
            });
        }

        const [connection] = await db
            .select()
            .from(platformConnections)
            .where(
                and(
                    eq(platformConnections.id, connectionId),
                    eq(platformConnections.userId, userId),
                ),
            )
            .limit(1);

        if (!connection) {
            return res.status(404).json({
                success: false,
                error: 'Connection not found',
            });
        }

        res.json({
            success: true,
            connection: {
                ...mapConnection(connection),
                permissions: {
                    ...DEFAULT_PERMISSIONS,
                    ...(req.body?.permissions || {}),
                },
            },
            message: 'Permissions updated',
        });
    } catch (error: any) {
        console.error('Update permissions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update permissions',
        });
    }
});

/**
 * GET /api/connections/:id/activity
 * Preserve legacy endpoint with scaffolded activity feed.
 */
router.get('/:id/activity', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const connectionId = parseConnectionId(req.params.id);
        if (!connectionId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid connection id',
            });
        }

        if (!db) {
            return res.status(503).json({
                success: false,
                error: 'Database is required for connection activity',
            });
        }

        const [connection] = await db
            .select()
            .from(platformConnections)
            .where(
                and(
                    eq(platformConnections.id, connectionId),
                    eq(platformConnections.userId, userId),
                ),
            )
            .limit(1);

        if (!connection) {
            return res.status(404).json({
                success: false,
                error: 'Connection not found',
            });
        }

        const activity = connection.lastSyncedAt
            ? [{ type: 'sync', timestamp: connection.lastSyncedAt, description: 'Connection metadata synced' }]
            : [];

        res.json({
            success: true,
            connection: {
                id: String(connection.id),
                platformName: connection.platformName,
            },
            activity,
        });
    } catch (error: any) {
        console.error('Activity log error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get activity log',
        });
    }
});

export default router;
