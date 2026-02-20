import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import identityRoutes from '../server/routes/identity';

vi.mock('../server/services/model-sidecar-service', () => ({
  inferLivenessAndEmbedding: vi.fn(async () => ({
    isReal: true,
    confidence: 0.97,
    spoofingDetected: false,
    faceDetected: true,
    reasoning: 'mock-sidecar',
    embedding: [0.11, 0.22, 0.33, 0.44],
  })),
  extractEmbedding: vi.fn(async () => [0.11, 0.22, 0.33, 0.44]),
}));

describe('identity liveness camera challenge-response hooks', () => {
  it('accepts sequential camera evidence and completes session', async () => {
    const app = express();
    app.use(express.json({ limit: '5mb' }));
    app.use('/api/v1/identity', identityRoutes);

    const start = await request(app)
      .post('/api/v1/identity/liveness/start')
      .send({ userId: 'u-live-1' });

    expect(start.status).toBe(200);
    const sessionId = start.body.sessionId;
    const challenges = start.body.challenges as Array<{ id: string; type: string }>;

    for (const c of challenges) {
      const evidence: any = {
        timestamp: Date.now(),
        faceDetected: true,
        spoofRisk: 0.1,
        motionScore: 0.7,
      };
      if (c.type === 'blink') evidence.blinkCount = 2;
      if (c.type === 'turn_left') evidence.yawDelta = -15;
      if (c.type === 'turn_right') evidence.yawDelta = 15;
      if (c.type === 'smile') evidence.smileScore = 0.6;
      if (c.type === 'nod') evidence.pitchDelta = 10;

      const step = await request(app)
        .post('/api/v1/identity/liveness/challenge-response')
        .send({
          sessionId,
          challengeId: c.id,
          frameData: `data:image/jpeg;base64,${'A'.repeat(256)}${Math.random().toString(36).repeat(4)}`,
          cameraEvidence: evidence,
        });

      expect(step.status).toBe(200);
    }

    const result = await request(app).get(`/api/v1/identity/liveness/${sessionId}`);
    expect(result.status).toBe(200);
    expect(result.body.result.completedChallenges).toBe(3);
  });

  it('rejects spoof/high-risk challenge evidence', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/identity', identityRoutes);

    const start = await request(app)
      .post('/api/v1/identity/liveness/start')
      .send({ userId: 'u-live-2' });

    const challenge = start.body.challenges[0];
    const bad = await request(app)
      .post('/api/v1/identity/liveness/challenge')
      .send({
        sessionId: start.body.sessionId,
        challengeId: challenge.id,
        frameData: `data:image/jpeg;base64,${'B'.repeat(300)}`,
        cameraEvidence: {
          timestamp: Date.now(),
          faceDetected: true,
          spoofRisk: 0.9,
          motionScore: 0.9,
          blinkCount: 2,
        },
      });

    expect(bad.status).toBe(400);
    expect(String(bad.body.code)).toContain('challenge_validation_failed');
  });
});
