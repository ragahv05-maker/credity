import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getApiKey = vi.fn();
const verifyAccessToken = vi.fn();

vi.mock('../server/storage', () => ({
  storage: {
    getApiKey,
  },
}));

vi.mock('@credverse/shared-auth', () => ({
  verifyAccessToken,
}));

describe('issuer api auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts valid x-api-key and sets tenant context', async () => {
    getApiKey.mockResolvedValue({ tenantId: 'tenant-1', expiresAt: null });

    const { apiKeyMiddleware } = await import('../server/auth');
    const app = express();
    app.get('/check', apiKeyMiddleware, (req, res) => {
      res.json({ tenantId: (req as any).tenantId });
    });

    const res = await request(app).get('/check').set('x-api-key', 'valid-key');
    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe('tenant-1');
  });

  it('accepts valid bearer token fallback and resolves tenant from token userId', async () => {
    verifyAccessToken.mockReturnValue({ userId: 99, username: 'u', role: 'issuer' });

    const { apiKeyOrAuthMiddleware } = await import('../server/auth');
    const app = express();
    app.get('/check', apiKeyOrAuthMiddleware, (req, res) => {
      res.json({ tenantId: (req as any).tenantId, userId: (req as any).user?.userId });
    });

    const res = await request(app).get('/check').set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ tenantId: '99', userId: 99 });
  });

  it('rejects invalid auth when neither api key nor bearer token is valid', async () => {
    verifyAccessToken.mockReturnValue(null);

    const { apiKeyOrAuthMiddleware } = await import('../server/auth');
    const app = express();
    app.get('/check', apiKeyOrAuthMiddleware, (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const res = await request(app).get('/check').set('Authorization', 'Bearer bad');
    expect(res.status).toBe(401);
  });
});
