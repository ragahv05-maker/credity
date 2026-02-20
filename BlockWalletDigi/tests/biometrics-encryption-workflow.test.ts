import express from 'express';
import request from 'supertest';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import identityRoutes from '../server/routes/identity';
import { __unsafeTemplateRecordForTests } from '../server/services/biometrics-service';

const previousAllowClientIngest = process.env.ALLOW_CLIENT_EMBEDDING_INGEST;
beforeAll(() => {
  process.env.ALLOW_CLIENT_EMBEDDING_INGEST = 'true';
});
afterAll(() => {
  if (previousAllowClientIngest === undefined) delete process.env.ALLOW_CLIENT_EMBEDDING_INGEST;
  else process.env.ALLOW_CLIENT_EMBEDDING_INGEST = previousAllowClientIngest;
});

describe('biometric encrypted template + embedding verification workflow', () => {
  it('stores encrypted template metadata and verifies live embedding', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/identity', identityRoutes);

    const embedding = [0.2, 0.1, 0.6, 0.4, 0.11, 0.22, 0.33, 0.44];
    const enroll = await request(app).post('/api/v1/identity/biometrics/enroll').send({
      userId: 'bio-u1',
      type: 'face_id',
      deviceId: 'ios-device',
      faceEmbedding: embedding,
    });

    expect(enroll.status).toBe(200);
    expect(enroll.body.enrollment.metadata.algorithm).toBe('face_embedding_v1');

    const stored = __unsafeTemplateRecordForTests('bio-u1');
    expect(stored).toBeTruthy();
    expect(stored?.encryptedTemplate.ciphertext).toBeTruthy();
    expect(stored?.encryptedTemplate.ciphertext).not.toContain('[0.2,0.1');

    const verify = await request(app).post('/api/v1/identity/biometrics/verify').send({
      userId: 'bio-u1',
      challengeId: 'c-1',
      liveFaceEmbedding: [0.201, 0.101, 0.599, 0.401, 0.11, 0.22, 0.33, 0.44],
      antiSpoof: { liveSpoofRisk: 0.1, liveFaceDetected: true },
    });

    expect(verify.status).toBe(200);
    expect(verify.body.verified).toBe(true);
    expect(verify.body.result.confidence).toBeGreaterThan(0.95);
  });

  it('fails verification when anti-spoof check fails', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/identity', identityRoutes);

    await request(app).post('/api/v1/identity/biometrics/enroll').send({
      userId: 'bio-u2',
      type: 'face_id',
      faceEmbedding: [0.4, 0.2, 0.5, 0.1],
    });

    const verify = await request(app).post('/api/v1/identity/biometrics/verify').send({
      userId: 'bio-u2',
      challengeId: 'c-2',
      liveFaceEmbedding: [0.4, 0.2, 0.5, 0.1],
      antiSpoof: { liveSpoofRisk: 0.91, liveFaceDetected: true },
    });

    expect(verify.status).toBe(400);
    expect(String(verify.body.error)).toContain('anti_spoof_check_failed');
  });
});
