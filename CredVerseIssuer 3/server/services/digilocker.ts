/**
 * DigiLocker Integration Service
 * 
 * DigiLocker is India's government digital document wallet.
 * This service handles pushing credentials to DigiLocker.
 * 
 * For production, you need to:
 * 1. Register as DigiLocker Partner at https://partners.digilocker.gov.in
 * 2. Get Client ID and Secret
 * 3. Implement OAuth flow for user consent
 * 
 * API Documentation: https://developers.digilocker.gov.in/
 */

import crypto from 'crypto';
import { PostgresStateStore } from '@credverse/shared-auth';
import { encrypt, type EncryptedData } from './crypto-utils';

export interface DigiLockerConfig {
    clientId: string;
    clientSecret: string;
    baseUrl: string;
    redirectUri: string;
}

export interface DigiLockerPushDocument {
    docType: string;
    docRef: string;
    docName: string;
    docData: string; // Base64 encoded
    issuerName: string;
    issuerId: string;
    recipientAadhaar?: string;
    recipientMobile?: string;
    validFrom: Date;
    validUntil?: Date;
}

export interface DigiLockerPushResult {
    success: boolean;
    transactionId?: string;
    error?: string;
    digiLockerUri?: string;
}

export interface DigiLockerDocument {
    uri: string;
    name: string;
    type: string;
    issuer: string;
    date: string;
    mimeType: string;
    size?: number;
}

class DigiLockerService {
    private config: DigiLockerConfig;
    private isConfigured: boolean;
    private allowDemoMode: boolean;

    constructor() {
        this.allowDemoMode =
            process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEMO_ROUTES === 'true';
        this.config = {
            clientId: process.env.DIGILOCKER_CLIENT_ID || '',
            clientSecret: process.env.DIGILOCKER_CLIENT_SECRET || '',
            baseUrl: process.env.DIGILOCKER_BASE_URL || 'https://api.digitallocker.gov.in',
            redirectUri: process.env.DIGILOCKER_REDIRECT_URI || 'http://localhost:5001/api/v1/digilocker/callback',
        };
        this.isConfigured = !!(this.config.clientId && this.config.clientSecret);

        if (!this.isConfigured && !this.allowDemoMode) {
            console.warn('[Issuer DigiLocker] Credentials are not configured. Demo mode is disabled.');
        }
    }

    /**
     * Generate OAuth URL for user consent
     */
    getAuthUrl(state: string): string {
        if (!this.isConfigured) {
            if (!this.allowDemoMode) {
                throw new Error('DigiLocker integration is not configured');
            }
            return `/digilocker/demo-auth?state=${state}`;
        }

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            state,
            scope: 'docs:push',
        });

        return `${this.config.baseUrl}/oauth/authorize?${params.toString()}`;
    }

    /**
     * Push document to DigiLocker
     */
    async pushDocument(
        accessToken: string,
        document: DigiLockerPushDocument
    ): Promise<DigiLockerPushResult> {
        if (!this.isConfigured) {
            if (!this.allowDemoMode) {
                return {
                    success: false,
                    error: 'DigiLocker integration is not configured',
                };
            }
            // Demo mode - simulate successful push
            console.log("=".repeat(60));
            console.log("📱 DIGILOCKER PUSH (Demo Mode)");
            console.log("=".repeat(60));
            console.log(`Document: ${document.docName}`);
            console.log(`Type: ${document.docType}`);
            console.log(`Issuer: ${document.issuerName}`);
            console.log(`Reference: ${document.docRef}`);
            console.log("=".repeat(60));

            return {
                success: true,
                transactionId: `DL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                digiLockerUri: `digilocker://view/${document.docRef}`,
            };
        }

        try {
            // Real DigiLocker API call
            const response = await fetch(`${this.config.baseUrl}/v2/documents/push`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    doctype: document.docType,
                    documentreference: document.docRef,
                    documentname: document.docName,
                    documentcontent: document.docData,
                    issuername: document.issuerName,
                    issuerid: document.issuerId,
                    validfrom: document.validFrom.toISOString(),
                    validto: document.validUntil?.toISOString(),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                return {
                    success: false,
                    error: error.message || 'Failed to push to DigiLocker',
                };
            }

            const result = await response.json();
            return {
                success: true,
                transactionId: result.transactionid,
                digiLockerUri: result.uri,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'DigiLocker API error',
            };
        }
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCode(code: string): Promise<{ accessToken: string; expiresIn: number } | null> {
        if (!this.isConfigured) {
            if (!this.allowDemoMode) {
                return null;
            }
            // Demo mode
            return {
                accessToken: `demo-token-${Date.now()}`,
                expiresIn: 3600,
            };
        }

        try {
            const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret,
                    redirect_uri: this.config.redirectUri,
                }),
            });

            if (!response.ok) return null;

            const data = await response.json();
            return {
                accessToken: data.access_token,
                expiresIn: data.expires_in,
            };
        } catch {
            return null;
        }
    }

    /**
     * Get supported document types for DigiLocker
     */
    getSupportedDocTypes(): { code: string; name: string; description: string }[] {
        return [
            { code: "DEGREE", name: "Degree Certificate", description: "University degree or diploma" },
            { code: "MARKSHEET", name: "Marksheet", description: "Academic grade card" },
            { code: "TRANSCRIPT", name: "Transcript", description: "Complete academic transcript" },
            { code: "CERTIFICATE", name: "Certificate", description: "Course completion certificate" },
            { code: "AWARD", name: "Award", description: "Achievement or recognition award" },
            { code: "LICENSE", name: "Professional License", description: "Professional qualification" },
        ];
    }

    isReady(): boolean {
        return this.isConfigured;
    }
}

export const digiLockerService = new DigiLockerService();

interface UserPullOAuthState {
    userId: string;
    nonce: string;
    issuedAt: number;
}

interface UserPullTokenBundle {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    receivedAt: string;
}

interface StoredEncryptedUserPullTokens extends EncryptedData {
    expiresAt: string;
}

interface PersistedUserPullState {
    encryptedTokens: Array<[string, StoredEncryptedUserPullTokens]>;
}

const USER_PULL_AUTH_URL = 'https://digilocker.gov.in/public/oauth2/1/authorize';
const USER_PULL_TOKEN_URL = 'https://digilocker.gov.in/public/oauth2/1/token';
const USER_PULL_LIST_URL = 'https://digilocker.gov.in/public/oauth2/2/files';
const USER_PULL_DOC_PREFIX = 'https://digilocker.gov.in/public/oauth2/1/xml/';

const userPullTokenStore = new Map<string, StoredEncryptedUserPullTokens>();
const userPullStateStore = process.env.DATABASE_URL
    ? new PostgresStateStore<PersistedUserPullState>({
        databaseUrl: process.env.DATABASE_URL as string,
        serviceKey: 'issuer-digilocker-user-pull-state',
    })
    : null;
let userPullHydrated = false;
let userPullHydrationPromise: Promise<void> | null = null;
let userPullPersistChain = Promise.resolve();

function resolveTokenEncryptionKey(): string {
    const configured = process.env.DIGILOCKER_TOKEN_ENCRYPTION_KEY;
    if (configured && /^[a-fA-F0-9]{64}$/.test(configured)) {
        return configured;
    }
    return crypto
        .createHash('sha256')
        .update(process.env.DIGILOCKER_CLIENT_SECRET || 'issuer-digilocker-user-pull-dev')
        .digest('hex');
}

function resolveUserPullRedirectUri(): string {
    const explicit = process.env.DIGILOCKER_USER_PULL_REDIRECT_URI;
    if (explicit && explicit.trim().length > 0) {
        return explicit.trim();
    }

    const blockwalletUrl = (process.env.BLOCKWALLET_URL || 'http://localhost:5000').replace(/\/+$/, '');
    return `${blockwalletUrl}/connections/digilocker/callback`;
}

function encodeUserPullState(userId: string, state: string): string {
    const payload: UserPullOAuthState = {
        userId,
        nonce: state,
        issuedAt: Date.now(),
    };
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeUserPullState(state: string): UserPullOAuthState {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as Partial<UserPullOAuthState>;
    if (!decoded.userId || !decoded.nonce) {
        throw new Error('Invalid DigiLocker user-pull state');
    }

    return {
        userId: String(decoded.userId),
        nonce: String(decoded.nonce),
        issuedAt: Number(decoded.issuedAt || Date.now()),
    };
}

function mapListDocument(item: Record<string, any>): DigiLockerDocument {
    const sizeRaw = item.size;
    const size = typeof sizeRaw === 'number'
        ? sizeRaw
        : typeof sizeRaw === 'string' && sizeRaw.trim().length > 0
            ? Number(sizeRaw)
            : undefined;

    return {
        uri: String(item.uri || item.documentUri || item.docuri || ''),
        name: String(item.name || item.docname || item.documentName || 'Document'),
        type: String(item.type || item.doctype || item.documentType || 'UNKNOWN'),
        issuer: String(item.issuer || item.issuername || item.issuerid || 'Unknown Issuer'),
        date: String(item.date || item.issuedOn || item.issuanceDate || ''),
        mimeType: String(item.mimeType || item.mime || item.mimetype || 'application/octet-stream'),
        size: Number.isFinite(size) ? size : undefined,
    };
}

async function ensureUserPullStateHydrated(): Promise<void> {
    if (!userPullStateStore || userPullHydrated) return;

    if (!userPullHydrationPromise) {
        userPullHydrationPromise = (async () => {
            const loaded = await userPullStateStore.load();
            userPullTokenStore.clear();
            for (const [userId, encryptedTokens] of loaded?.encryptedTokens || []) {
                userPullTokenStore.set(userId, encryptedTokens);
            }
            userPullHydrated = true;
        })();
    }

    await userPullHydrationPromise;
}

async function persistUserPullState(): Promise<void> {
    if (!userPullStateStore) return;

    userPullPersistChain = userPullPersistChain
        .then(() => userPullStateStore.save({
            encryptedTokens: Array.from(userPullTokenStore.entries()),
        }))
        .catch((error) => {
            console.error('[Issuer DigiLocker] Failed to persist user-pull token state:', error);
        });

    await userPullPersistChain;
}

/**
 * Build OAuth URL for DigiLocker user-pull flow.
 */
export async function getUserPullAuthUrl(userId: string, state: string): Promise<string> {
    if (!process.env.DIGILOCKER_CLIENT_ID || !process.env.DIGILOCKER_CLIENT_SECRET) {
        throw new Error('DigiLocker user-pull credentials are not configured');
    }

    const encodedState = encodeUserPullState(userId, state);
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.DIGILOCKER_CLIENT_ID,
        redirect_uri: resolveUserPullRedirectUri(),
        state: encodedState,
        scope: 'avs: profile: aadhaar',
    });

    return `${USER_PULL_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange user-pull authorization code and persist encrypted tokens keyed by userId.
 */
export async function exchangeUserPullCode(
    code: string,
    state: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    if (!process.env.DIGILOCKER_CLIENT_ID || !process.env.DIGILOCKER_CLIENT_SECRET) {
        throw new Error('DigiLocker user-pull credentials are not configured');
    }

    await ensureUserPullStateHydrated();
    const decodedState = decodeUserPullState(state);

    const tokenResponse = await fetch(USER_PULL_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: process.env.DIGILOCKER_CLIENT_ID,
            client_secret: process.env.DIGILOCKER_CLIENT_SECRET,
            redirect_uri: resolveUserPullRedirectUri(),
        }),
    });

    if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.text();
        throw new Error(`Failed to exchange DigiLocker user-pull code: ${errorBody}`);
    }

    const tokenPayload = await tokenResponse.json() as Record<string, any>;
    const tokens = {
        accessToken: String(tokenPayload.access_token || ''),
        refreshToken: String(tokenPayload.refresh_token || ''),
        expiresIn: Number(tokenPayload.expires_in || 3600),
    };

    if (!tokens.accessToken) {
        throw new Error('DigiLocker user-pull token exchange returned no access token');
    }

    const tokenBundle: UserPullTokenBundle = {
        ...tokens,
        receivedAt: new Date().toISOString(),
    };
    const encryptedBundle = encrypt(JSON.stringify(tokenBundle), resolveTokenEncryptionKey());

    userPullTokenStore.set(decodedState.userId, {
        ...encryptedBundle,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
    });
    await persistUserPullState();

    return tokens;
}

/**
 * Fetch all documents available in the DigiLocker account.
 */
export async function listUserDocuments(accessToken: string): Promise<DigiLockerDocument[]> {
    const response = await fetch(USER_PULL_LIST_URL, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to list DigiLocker documents: ${errorBody}`);
    }

    const payload = await response.json() as Record<string, any>;
    const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.items)
            ? payload.items
            : Array.isArray(payload.files)
                ? payload.files
                : [];

    return items.map((item) => mapListDocument(item));
}

/**
 * Pull a single DigiLocker document and return base64 encoded contents.
 */
export async function pullDocument(
    accessToken: string,
    uri: string
): Promise<{ base64: string; mimeType: string }> {
    const requestUrl = uri.startsWith('http://') || uri.startsWith('https://')
        ? uri
        : `${USER_PULL_DOC_PREFIX}${uri.replace(/^\/+/, '')}`;

    const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to pull DigiLocker document: ${errorBody}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim()
        || (requestUrl.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/xml');

    return {
        base64: bytes.toString('base64'),
        mimeType,
    };
}
