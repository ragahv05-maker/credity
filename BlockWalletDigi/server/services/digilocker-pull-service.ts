import crypto from 'crypto';
import { PostgresStateStore } from '@credverse/shared-auth';
import { decrypt, encrypt, type EncryptedData } from './crypto-utils';

export interface DigiLockerDocument {
    uri: string;
    name: string;
    type: string;
    issuer: string;
    date: string;
    mimeType: string;
    size?: number;
}

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
        serviceKey: 'wallet-digilocker-user-pull-state',
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
        .update(process.env.DIGILOCKER_CLIENT_SECRET || 'wallet-digilocker-user-pull-dev')
        .digest('hex');
}

function resolveUserPullRedirectUri(): string {
    const explicit = process.env.DIGILOCKER_USER_PULL_REDIRECT_URI;
    if (explicit && explicit.trim().length > 0) {
        return explicit.trim();
    }

    const blockwalletUrl = (process.env.BLOCKWALLET_URL || 'http://localhost:5000').replace(/\/+$/, '');
    return `${blockwalletUrl}/api/connections/digilocker/callback`;
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
            console.error('[Wallet DigiLocker] Failed to persist user-pull token state:', error);
        });

    await userPullPersistChain;
}

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

export async function getStoredUserPullTokens(userId: number): Promise<UserPullTokenBundle | null> {
    await ensureUserPullStateHydrated();
    const encryptedTokens = userPullTokenStore.get(String(userId));
    if (!encryptedTokens) return null;

    if (new Date(encryptedTokens.expiresAt).getTime() <= Date.now()) {
        return null;
    }

    try {
        const decrypted = decrypt(
            {
                ciphertext: encryptedTokens.ciphertext,
                iv: encryptedTokens.iv,
                authTag: encryptedTokens.authTag,
            },
            resolveTokenEncryptionKey(),
        );
        return JSON.parse(decrypted) as UserPullTokenBundle;
    } catch (error) {
        console.error('[Wallet DigiLocker] Failed to decrypt stored user-pull tokens:', error);
        return null;
    }
}

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
