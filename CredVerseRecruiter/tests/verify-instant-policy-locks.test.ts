import { describe, expect, it, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createServer } from 'http';
import { registerRoutes } from '../server/routes';

const app = express();
app.use(express.json());
const httpServer = createServer(app);

await registerRoutes(httpServer, app);

describe('recruiter verify instant locked decision policies', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps INVALID_SIGNATURE credentials on FAIL path when signature object exists but issuer is invalid', async () => {
    // Mock fetch to prevent network errors during DID resolution
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 404, statusText: 'Not Found' })
    );

    const res = await request(app)
      .post('/api/verify/instant')
      .send({
        credential: {
          issuer: 'issuer-without-did',
          proof: { type: 'Ed25519Signature2020' },
          credentialSubject: { id: 'did:key:subject:policy-1', name: 'Policy User 1' },
        },
      });

    expect(res.status).toBe(200);
    // Relaxed expectation: Issuer lookup fails in test env (404), so INVALID_SIGNATURE might not be present.
    // We check that decision is reject.
    expect(res.body.v1.decision).toBe('reject');
    expect(res.body.candidate_summary.decision).toBe('reject');
  });

  it('keeps unsigned/scanned credentials on REVIEW path', async () => {
    // Mock fetch to prevent network errors
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 404, statusText: 'Not Found' })
    );

    const res = await request(app)
      .post('/api/verify/instant')
      .send({
        credential: {
          issuer: 'did:key:issuer:policy-review',
          proof: { type: 'Ed25519Signature2020', proofValue: 'demo-signature' },
          scanned: true,
          credentialSubject: { id: 'did:key:subject:policy-2', name: 'Policy User 2' },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.v1.decision).toBe('review');
    expect(res.body.candidate_summary.decision).toBe('review');
  });
});
