import test from 'node:test';
import assert from 'node:assert/strict';
import { CredVerse } from '../dist/index.js';

test('generateProof sends contract fields and returns proof result', async () => {
  let seenPath = '';
  let seenBody = null;
  const sdk = new CredVerse({
    baseUrl: 'https://issuer.credverse.test',
    apiKey: 'test-key',
    fetchImpl: async (input, init) => {
      seenPath = new URL(String(input)).pathname;
      seenBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          id: 'proof_abc',
          status: 'generated',
          format: 'sd-jwt-vc',
          proof: 'eyJhbGciOiJFUzI1NiJ9.payload.sig',
          created_at: new Date().toISOString(),
          code: 'PROOF_GENERATED',
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const result = await sdk.generateProof({
    format: 'sd-jwt-vc',
    subject_did: 'did:cred:holder:99',
    proof_purpose: 'assertionMethod',
    challenge: 'nonce-xyz',
  });

  assert.equal(seenPath, '/api/v1/proofs/generate');
  assert.equal(seenBody.format, 'sd-jwt-vc');
  assert.equal(seenBody.subject_did, 'did:cred:holder:99');
  assert.equal(seenBody.proof_purpose, 'assertionMethod');
  assert.equal(seenBody.challenge, 'nonce-xyz');
  assert.equal(result.status, 'generated');
  assert.equal(result.code, 'PROOF_GENERATED');
});

test('verifyProof posts to /v1/proofs/verify and returns verification result', async () => {
  let seenBody = null;
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async (_input, init) => {
      seenBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          id: 'verify_999',
          valid: false,
          decision: 'reject',
          reason_codes: ['PROOF_SIGNATURE_INVALID'],
          checked_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const result = await sdk.verifyProof({
    format: 'sd-jwt-vc',
    proof: 'bad-token',
    expected_issuer_did: 'did:cred:issuer:1',
  });

  assert.equal(seenBody.format, 'sd-jwt-vc');
  assert.equal(seenBody.proof, 'bad-token');
  assert.equal(seenBody.expected_issuer_did, 'did:cred:issuer:1');
  assert.equal(result.valid, false);
  assert.equal(result.decision, 'reject');
  assert.deepEqual(result.reason_codes, ['PROOF_SIGNATURE_INVALID']);
});

test('verify sets zkProof when includeZkProof=true and proof endpoint succeeds', async () => {
  let callCount = 0;
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            success: true,
            reputation: {
              user_id: 1,
              score: 800,
              event_count: 5,
              category_breakdown: [],
              computed_at: new Date().toISOString(),
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          id: 'proof_zk',
          status: 'generated',
          format: 'sd-jwt-vc',
          proof: 'zk-token',
          created_at: new Date().toISOString(),
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const result = await sdk.verify({ userId: 1, vertical: 'OVERALL', includeZkProof: true });
  assert.equal(callCount, 2);
  assert.notEqual(result.zkProof, null);
  assert.equal(result.zkProof?.status, 'generated');
});

test('verify leaves zkProof null when includeZkProof is not set', async () => {
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          success: true,
          reputation: { user_id: 1, score: 800, event_count: 5, category_breakdown: [], computed_at: new Date().toISOString() },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
  });

  const result = await sdk.verify({ userId: 1, vertical: 'OVERALL' });
  assert.equal(result.zkProof, null);
});

test('verify sets zkProof to null when proof endpoint returns 503', async () => {
  let callCount = 0;
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            success: true,
            reputation: { user_id: 1, score: 700, event_count: 2, category_breakdown: [], computed_at: new Date().toISOString() },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ error: 'Service unavailable' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  const result = await sdk.verify({ userId: 1, vertical: 'OVERALL', includeZkProof: true });
  assert.equal(result.zkProof, null);
  assert.equal(result.score, 70);
});

test('request aborts when timeoutMs is exceeded', async () => {
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    timeoutMs: 1,
    fetchImpl: () =>
      new Promise((resolve) =>
        setTimeout(
          () => resolve(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })),
          200,
        ),
      ),
  });

  await assert.rejects(
    () => sdk.getReputationScore({ userId: 1, vertical: 'OVERALL' }),
    (err) => {
      const name = /** @type {Error} */ (err).name;
      return name === 'AbortError' || name === 'DOMException' || String(err).toLowerCase().includes('abort');
    },
  );
});

test('getRevocationWitness fetches from correct path', async () => {
  let seenPath = '';
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async (input) => {
      seenPath = new URL(String(input)).pathname;
      return new Response(
        JSON.stringify({
          credential_id: 'vc-123',
          revoked: false,
          status_list: { list_id: 'sl-1', index: 5, revoked: false },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const result = await sdk.getRevocationWitness('vc-123');
  assert.equal(seenPath, '/api/v1/proofs/revocation-witness/vc-123');
  assert.equal(result.revoked, false);
  assert.equal(result.credential_id, 'vc-123');
});
