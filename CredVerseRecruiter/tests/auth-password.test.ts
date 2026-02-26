import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../server/routes';

// Setup app
const app = express();
app.use(express.json());
const httpServer = createServer(app);

// Register routes
await registerRoutes(httpServer, app);

describe('Auth Registration Password Strength', () => {
  it('should reject weak passwords', async () => {
    const username = `user_weak_${Date.now()}`;
    const password = '123'; // Weak password

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username,
        password,
      });

    // Currently this will fail (it will return 201), so we expect 400 after fix
    // We log the status to confirm vulnerability if it's 201
    if (res.status === 201) {
       console.warn("Vulnerability confirmed: Weak password accepted (Status 201)");
    }

    // This expectation will fail currently, which is what we want for reproduction
    expect(res.status).toBe(400);
    // Ideally we'd check for specific error structure but 400 is enough for now
    if (res.body.errors) {
        expect(Array.isArray(res.body.errors)).toBe(true);
    }
  });

  it('should accept strong passwords', async () => {
    const username = `user_strong_${Date.now()}`;
    const password = 'StrongPassword123!';

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username,
        password,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
