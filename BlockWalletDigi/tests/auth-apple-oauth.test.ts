import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function createUnsignedJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

describe('auth apple oauth', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.APPLE_CLIENT_ID = 'com.credity.wallet';
    process.env.APPLE_CALLBACK_URL = 'http://localhost:5000/api/v1/auth/apple/callback';
  });

  it('authenticates via valid Apple identity token', async () => {
    const { default: authRoutes } = await import('../server/routes/auth');

    const app = express();
    app.use(express.json());
    app.use('/api/v1', authRoutes);

    const identityToken = createUnsignedJwt({
      iss: 'https://appleid.apple.com',
      aud: 'com.credity.wallet',
      sub: 'apple-user-123',
      exp: Math.floor(Date.now() / 1000) + 3600,
      email: 'apple.user@example.com',
      email_verified: 'true',
    });

    const res = await request(app)
      .post('/api/v1/auth/apple')
      .send({ identityToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tokens?.accessToken).toBeTruthy();
    expect(res.body.tokens?.refreshToken).toBeTruthy();
  });
});
