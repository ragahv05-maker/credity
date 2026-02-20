import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import identityRoutes from '../server/routes/identity';

describe('identity document type validation', () => {
  it('accepts valid IDs and rejects malformed ones', async () => {
    const app = express();
    app.use(express.json({ limit: '2mb' }));
    app.use('/api/v1/identity', identityRoutes);

    const validPan = await request(app)
      .post('/api/v1/identity/document/validate-type')
      .send({ type: 'pan', documentNumber: 'ABCDE1234F' });
    expect(validPan.status).toBe(200);
    expect(validPan.body.valid).toBe(true);

    const invalidAadhaar = await request(app)
      .post('/api/v1/identity/document/validate-type')
      .send({ type: 'aadhaar', documentNumber: '12345' });
    expect(invalidAadhaar.status).toBe(400);
    expect(invalidAadhaar.body.valid).toBe(false);
  });
});
