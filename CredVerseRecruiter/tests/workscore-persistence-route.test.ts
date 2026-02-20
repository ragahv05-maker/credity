import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createServer } from 'http';
import { registerRoutes } from '../server/routes';
import { generateAccessToken } from '../server/services/auth-service';

const app = express();
app.use(express.json());
const httpServer = createServer(app);

await registerRoutes(httpServer, app);

function authHeader(role: 'admin' | 'issuer' | 'holder' | 'verifier' | 'recruiter' = 'recruiter') {
  const token = generateAccessToken({
    id: `test-${role}`,
    username: `test-${role}`,
    role,
  });
  return `Bearer ${token}`;
}

describe('workscore persistence snapshots', () => {
  it('persists evaluate snapshots and lists them via additive read endpoint', async () => {
    const payload = {
      candidate_id: 'candidate-123',
      context: { pipeline: 'backend', stage: 'onsite' },
      components: {
        identity: 1,
        education: 0.8,
        employment: 0.9,
        reputation: 0.7,
        skills: 1,
        crossTrust: 0.4,
      },
      reason_codes: ['SKILL_UNVERIFIED'],
      evidence: {
        summary: 'persistence test run',
        anchors_checked: ['anchor:work:1'],
        docs_checked: ['doc:resume:1'],
      },
    };

    const evaluateRes = await request(app).post('/api/workscore/evaluate').send(payload);
    expect(evaluateRes.status).toBe(200);

    const listRes = await request(app)
      .get('/api/workscore/evaluations')
      .set('Authorization', authHeader())
      .query({ limit: 10 });
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.evaluations)).toBe(true);

    const persisted = listRes.body.evaluations.find(
      (row: any) => row?.evidence?.summary === payload.evidence.summary,
    );

    expect(persisted).toBeDefined();
    expect(persisted).toMatchObject({
      score: evaluateRes.body.score,
      breakdown: evaluateRes.body.breakdown,
      decision: evaluateRes.body.decision,
      reason_codes: evaluateRes.body.reason_codes,
      evidence: evaluateRes.body.evidence,
    });
    expect(typeof persisted.id).toBe('string');
    expect(typeof persisted.context_hash).toBe('string');
    expect(typeof persisted.candidate_hash).toBe('string');
    expect(new Date(persisted.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('applies policy-engine downgrade hook when enabled', async () => {
    process.env.FEATURE_WORKSCORE_POLICY_ENGINE = 'true';

    const response = await request(app)
      .post('/api/workscore/evaluate')
      .send({
        components: {
          identity: 1,
          education: 1,
          employment: 1,
          reputation: 1,
          skills: 1,
          crossTrust: 1,
        },
        evidence: {
          summary: '',
          docs_checked: [],
          anchors_checked: [],
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.policy?.enabled).toBe(true);
    expect(response.body.decision).toBe('REVIEW');

    delete process.env.FEATURE_WORKSCORE_POLICY_ENGINE;
  });

  it('reads a persisted snapshot by id', async () => {
    const listRes = await request(app)
      .get('/api/workscore/evaluations')
      .set('Authorization', authHeader())
      .query({ limit: 1 });
    expect(listRes.status).toBe(200);
    expect(listRes.body.count).toBeGreaterThan(0);

    const id = listRes.body.evaluations[0].id;
    const getRes = await request(app)
      .get(`/api/workscore/evaluations/${id}`)
      .set('Authorization', authHeader());

    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(id);
    expect(getRes.body).toHaveProperty('timestamp');
    expect(getRes.body).toHaveProperty('score');
    expect(getRes.body).toHaveProperty('decision');
  });

  it('rejects unauthenticated access to snapshot read endpoints', async () => {
    const listRes = await request(app).get('/api/workscore/evaluations').query({ limit: 1 });
    expect(listRes.status).toBe(401);
    expect(listRes.body.error).toBe('No token provided');

    const getRes = await request(app).get('/api/workscore/evaluations/non-existent');
    expect(getRes.status).toBe(401);
    expect(getRes.body.error).toBe('No token provided');
  });

  it('rejects authenticated users without recruiter/verifier/admin role', async () => {
    const listRes = await request(app)
      .get('/api/workscore/evaluations')
      .set('Authorization', authHeader('holder'))
      .query({ limit: 1 });

    expect(listRes.status).toBe(403);
    expect(listRes.body.error).toBe('Insufficient permissions');
  });
});
