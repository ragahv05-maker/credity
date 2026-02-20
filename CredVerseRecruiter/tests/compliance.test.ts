import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../server/routes';

const app = express();
app.use(express.json());
const httpServer = createServer(app);
await registerRoutes(httpServer, app);

async function authHeader(): Promise<{ Authorization: string }> {
  const username = `compliance_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const password = 'RecruiterPass#123';

  await request(app).post('/api/auth/register').send({ username, password });
  const login = await request(app).post('/api/auth/login').send({ username, password });

  const accessToken = login.body?.tokens?.accessToken;
  if (!accessToken) {
    throw new Error('Recruiter test login did not return access token');
  }
  return { Authorization: `Bearer ${accessToken}` };
}

describe('Recruiter compliance API', () => {
  it('supports consent lifecycle and hash-chained audit export', async () => {
    const headers = await authHeader();
    const subjectId = `subject_${Date.now()}`;

    const created = await request(app)
      .post('/api/v1/compliance/consents')
      .set(headers)
      .send({
        subject_id: subjectId,
        verifier_id: 'recruiter-a',
        purpose: 'candidate_screening',
        data_elements: ['credential_validity', 'fraud_score'],
        expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

    expect(created.status).toBe(201);
    expect(typeof created.body.id).toBe('string');

    const revoked = await request(app)
      .post(`/api/v1/compliance/consents/${created.body.id}/revoke`)
      .set(headers)
      .send({});

    expect(revoked.status).toBe(200);
    expect(revoked.body.id).toBe(created.body.id);
    expect(typeof revoked.body.revocation_ts).toBe('string');

    const exported = await request(app)
      .get('/api/v1/compliance/audit-log/export')
      .set(headers);

    expect(exported.status).toBe(200);
    expect(exported.body.integrity?.valid).toBe(true);
    expect(Array.isArray(exported.body.events)).toBe(true);
    expect(exported.body.events.length).toBeGreaterThan(0);
  });

  it('replays idempotent consent create requests', async () => {
    const headers = await authHeader();
    const subjectId = `subject_${Date.now()}_idem`;

    const payload = {
      subject_id: subjectId,
      verifier_id: 'recruiter-a',
      purpose: 'candidate_screening',
      data_elements: ['credential_validity'],
      expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    const first = await request(app)
      .post('/api/v1/compliance/consents')
      .set(headers)
      .set('Idempotency-Key', 'idem-key-1')
      .send(payload);

    const second = await request(app)
      .post('/api/v1/compliance/consents')
      .set(headers)
      .set('Idempotency-Key', 'idem-key-1')
      .send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);
  });

  it('supports data export and delete requests', async () => {
    const headers = await authHeader();
    const subjectId = `subject_${Date.now()}_data`;

    const exportReq = await request(app)
      .post('/api/v1/compliance/data-requests/export')
      .set(headers)
      .send({
        subject_id: subjectId,
        reason: 'test_export',
      });

    expect(exportReq.status).toBe(202);
    expect(exportReq.body.request_type).toBe('export');
    expect(exportReq.body.status).toBe('completed');

    const deleteReq = await request(app)
      .post('/api/v1/compliance/data-requests/delete')
      .set(headers)
      .send({
        subject_id: subjectId,
        confirm: 'DELETE',
        reason: 'test_delete',
      });

    expect(deleteReq.status).toBe(202);
    expect(deleteReq.body.request_type).toBe('delete');
    expect(deleteReq.body.status).toBe('completed');

    const list = await request(app)
      .get('/api/v1/compliance/data-requests')
      .set(headers);

    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.requests)).toBe(true);
    const matching = list.body.requests.filter((entry: any) => entry.subject_id === subjectId);
    expect(matching.length).toBeGreaterThanOrEqual(2);
  });
});
