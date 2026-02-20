import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import identityRoutes from '../server/routes/identity';

describe('identity face match accuracy', () => {
  it('returns high confidence for matching embeddings and low for non-match', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/identity', identityRoutes);

    const matchRes = await request(app)
      .post('/api/v1/identity/face-match')
      .send({
        idFaceEmbedding: [0.2, 0.1, 0.6, 0.4],
        liveFaceEmbedding: [0.21, 0.11, 0.59, 0.41],
        threshold: 0.8,
      });

    expect(matchRes.status).toBe(200);
    expect(matchRes.body.matched).toBe(true);
    expect(matchRes.body.confidence).toBeGreaterThan(0.95);

    const noMatchRes = await request(app)
      .post('/api/v1/identity/face-match')
      .send({
        idFaceEmbedding: [1, 0, 0, 0],
        liveFaceEmbedding: [0, 1, 0, 0],
        threshold: 0.8,
      });

    expect(noMatchRes.status).toBe(200);
    expect(noMatchRes.body.matched).toBe(false);
    expect(noMatchRes.body.confidence).toBeLessThan(0.3);
  });
});
