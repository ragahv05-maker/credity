import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import authRoutes from '../server/routes/auth';

describe('auth pin fallback', () => {
  it('allows pin setup and fallback login', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1', authRoutes);

    const username = `pin_user_${Date.now()}`;
    const password = 'StrongPass1!';

    const register = await request(app)
      .post('/api/v1/auth/register')
      .send({ username, password, email: `${username}@example.com` });

    expect(register.status).toBe(201);
    const accessToken = register.body.tokens?.accessToken;
    expect(accessToken).toBeTruthy();

    const setup = await request(app)
      .post('/api/v1/auth/pin/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pin: '1234' });

    expect(setup.status).toBe(200);

    const fallback = await request(app)
      .post('/api/v1/auth/pin/verify')
      .send({ username, pin: '1234' });

    expect(fallback.status).toBe(200);
    expect(fallback.body.fallback).toBe('pin');
    expect(fallback.body.tokens?.accessToken).toBeTruthy();
  });
});
