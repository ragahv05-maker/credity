import crypto from 'crypto';

export interface AppleIdentityPayload {
    iss?: string;
    aud?: string;
    exp?: number;
    iat?: number;
    email?: string;
    email_verified?: 'true' | 'false' | boolean;
    sub?: string;
    nonce?: string;
}

function decodeJwtPayload(token: string): AppleIdentityPayload | null {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    try {
        const payloadRaw = Buffer.from(parts[1], 'base64url').toString('utf8');
        return JSON.parse(payloadRaw) as AppleIdentityPayload;
    } catch {
        return null;
    }
}

export function createAppleAuthState(): string {
    return crypto.randomBytes(16).toString('hex');
}

export function getAppleAuthorizationUrl(state: string): string {
    const clientId = process.env.APPLE_CLIENT_ID;
    const redirectUri = process.env.APPLE_CALLBACK_URL;

    if (!clientId || !redirectUri) {
        throw new Error('Apple OAuth is not configured');
    }

    const params = new URLSearchParams({
        response_type: 'code id_token',
        response_mode: 'form_post',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'name email',
        state,
    });

    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

export function verifyAppleIdentityToken(identityToken: string): AppleIdentityPayload {
    const payload = decodeJwtPayload(identityToken);
    if (!payload) {
        throw new Error('Invalid Apple identity token payload');
    }

    const expectedAudience = process.env.APPLE_CLIENT_ID;
    if (!expectedAudience) {
        throw new Error('Apple OAuth is not configured');
    }

    if (payload.iss !== 'https://appleid.apple.com') {
        throw new Error('Invalid token issuer');
    }

    if (payload.aud !== expectedAudience) {
        throw new Error('Invalid token audience');
    }

    if (!payload.sub) {
        throw new Error('Apple subject is required');
    }

    if (!payload.exp || payload.exp * 1000 < Date.now()) {
        throw new Error('Apple identity token expired');
    }

    return payload;
}
