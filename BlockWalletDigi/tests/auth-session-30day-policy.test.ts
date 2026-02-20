import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import authRoutes from '../server/routes/auth';
import { __test_backdateRefreshSession } from '../server/services/auth-service';

describe('auth 30 day session policy', () => {
  it('rejects refresh when absolute session age exceeds 30 days', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1', authRoutes);

    const username = `session_user_${Date.now()}`;
    const password = 'StrongPass1!';

    const register = await request(app)
      .post('/api/v1/auth/register')
      .send({ username, password, email: `${username}@example.com` });

    const refreshToken = register.body.tokens?.refreshToken;
    expect(refreshToken).toBeTruthy();

    const moved = __test_backdateRefreshSession(refreshToken, new Date(Date.now() - 31 * 24 * 60 * 60 * 1000));
    expect(moved).toBe(true);

    const refresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(refresh.status).toBe(401);
  });
});
