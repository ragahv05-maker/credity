import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function createAppleLikeToken(params: {
  payload: Record<string, unknown>;
  kid?: string;
  privateKey: crypto.KeyObject;
}): string {
  return jwt.sign(params.payload, params.privateKey, {
    algorithm: 'RS256',
    header: {
      kid: params.kid ?? 'apple-kid-1',
      typ: 'JWT',
      alg: 'RS256',
    },
  });
}

describe('auth apple oauth', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.APPLE_CLIENT_ID = 'com.credity.wallet';
    process.env.APPLE_CALLBACK_URL = 'http://localhost:5000/api/v1/auth/apple/callback';
  });

  it('authenticates via valid Apple identity token verified against JWKS', async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = publicKey.export({ format: 'jwk' }) as JsonWebKey;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        keys: [{
          kid: 'apple-kid-1',
          kty: 'RSA',
          alg: 'RS256',
          use: 'sig',
          n: jwk.n,
          e: jwk.e,
        }],
      }),
    }));

    const { default: authRoutes } = await import('../server/routes/auth');

    const app = express();
    app.use(express.json());
    app.use('/api/v1', authRoutes);

    const identityToken = createAppleLikeToken({
      privateKey,
      payload: {
        iss: 'https://appleid.apple.com',
        aud: 'com.credity.wallet',
        sub: 'apple-user-123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        email: 'apple.user@example.com',
        email_verified: 'true',
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/apple')
      .send({ identityToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tokens?.accessToken).toBeTruthy();
    expect(res.body.tokens?.refreshToken).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith('https://appleid.apple.com/auth/keys');

    vi.unstubAllGlobals();
  });

  it('rejects identity token if signing key cannot be resolved from JWKS', async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = publicKey.export({ format: 'jwk' }) as JsonWebKey;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        keys: [{
          kid: 'different-kid',
          kty: 'RSA',
          alg: 'RS256',
          use: 'sig',
          n: jwk.n,
          e: jwk.e,
        }],
      }),
    }));

    const { default: authRoutes } = await import('../server/routes/auth');

    const app = express();
    app.use(express.json());
    app.use('/api/v1', authRoutes);

    const identityToken = createAppleLikeToken({
      kid: 'unknown-kid',
      privateKey,
      payload: {
        iss: 'https://appleid.apple.com',
        aud: 'com.credity.wallet',
        sub: 'apple-user-123',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/apple')
      .send({ identityToken });

    expect(res.status).toBe(401);
    expect(String(res.body.error)).toContain('Apple signing key not found');

    vi.unstubAllGlobals();
  });
});
