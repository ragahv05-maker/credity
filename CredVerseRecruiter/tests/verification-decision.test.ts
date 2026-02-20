import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../server/routes';

const app = express();
app.use(express.json());
const httpServer = createServer(app);
await registerRoutes(httpServer, app);

async function authHeader(): Promise<{ Authorization: string }> {
  const username = `verify_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const password = 'RecruiterPass#123';

  await request(app).post('/api/auth/register').send({ username, password });
  const login = await request(app).post('/api/auth/login').send({ username, password });

  const accessToken = login.body?.tokens?.accessToken;
  if (!accessToken) {
    throw new Error('Recruiter test login did not return access token');
  }
  return { Authorization: `Bearer ${accessToken}` };
}

function baseCredential() {
  return {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential'],
    id: `urn:uuid:${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    issuer: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72',
    issuanceDate: new Date().toISOString(),
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    credentialSubject: {
      id: 'did:key:z6MkrKQXf2v8a1e6r3k4p9x7y2m5n8w1q4t7u9i2o5p8r1',
      name: 'Credity Candidate',
    },
  };
}

describe('verification decision policy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects credentials when signature validation fails', async () => {
    const headers = await authHeader();
    const credential = baseCredential();

    const res = await request(app)
      .post('/api/v1/verifications/instant')
      .set(headers)
      .send({ credential });

    expect(res.status).toBe(200);
    expect(res.body.credential_validity).toBe('invalid');
    expect(res.body.decision).toBe('reject');
    expect(Array.isArray(res.body.decision_reason_codes)).toBe(true);
    expect(res.body.decision_reason_codes).toContain('INVALID_SIGNATURE');
  });

  it('does not reject when proof is present and no hard-fail flags exist', async () => {
    const headers = await authHeader();
    const credential = {
      ...baseCredential(),
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        proofPurpose: 'assertionMethod',
        verificationMethod:
          'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72#key-1',
        jws: 'eyJhbGciOiJFZERTQSJ9.valid.signature',
      },
    };

    const res = await request(app)
      .post('/api/v1/verifications/instant')
      .set(headers)
      .send({ credential });

    expect(res.status).toBe(200);
    expect(res.body.decision).not.toBe('reject');
  });

  it('treats signed JWT credentials as signature-present', async () => {
    const headers = await authHeader();
    const payload = {
      iss: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72',
      sub: 'did:key:z6MkrKQXf2v8a1e6r3k4p9x7y2m5n8w1q4t7u9i2o5p8r1',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      vc: {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
      },
    };
    const header = { alg: 'EdDSA', typ: 'JWT' };
    const jwt =
      `${Buffer.from(JSON.stringify(header)).toString('base64url')}.` +
      `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.` +
      'signed-segment';

    const res = await request(app)
      .post('/api/v1/verifications/instant')
      .set(headers)
      .send({ jwt });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.decision_reason_codes)).toBe(true);
    expect(res.body.decision_reason_codes).not.toContain('INVALID_SIGNATURE');
    expect(res.body.decision).not.toBe('reject');
  });

  it('rejects signed JWT credentials when issuer reports revoked via vc verification', async () => {
    const headers = await authHeader();
    const payload = {
      iss: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72',
      sub: 'did:key:z6MkrKQXf2v8a1e6r3k4p9x7y2m5n8w1q4t7u9i2o5p8r1',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      vc: {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
      },
    };
    const header = { alg: 'EdDSA', typ: 'JWT' };
    const jwt =
      `${Buffer.from(JSON.stringify(header)).toString('base64url')}.` +
      `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.` +
      'signed-segment';

    const nativeFetch = globalThis.fetch;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/v1/verify?vc=')) {
        return new Response(JSON.stringify({ revoked: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return nativeFetch(input as any, init);
    });

    const res = await request(app)
      .post('/api/v1/verifications/instant')
      .set(headers)
      .send({ jwt });

    expect(fetchSpy).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body.status_validity).toBe('revoked');
    expect(res.body.decision).toBe('reject');
    expect(Array.isArray(res.body.decision_reason_codes)).toBe(true);
    expect(res.body.decision_reason_codes).toContain('REVOKED_CREDENTIAL');
  });
});
