import test from 'node:test';
import assert from 'node:assert/strict';
import { CredVerse } from '../dist/index.js';

test('verify maps OVERALL vertical score to normalized decision scale', async () => {
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          success: true,
          reputation: {
            user_id: 1,
            subject_did: 'did:cred:holder:1',
            score: 870,
            event_count: 42,
            category_breakdown: [],
            computed_at: new Date().toISOString(),
            vertical: 'overall',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
  });

  const result = await sdk.verify({ subjectDid: 'did:cred:holder:1', vertical: 'OVERALL', requiredScore: 70 });

  assert.equal(result.score, 87);
  assert.equal(result.recommendation, 'APPROVE');
  assert.equal(result.confidence, 'HIGH');
});

test('verify uses SafeDate score for DATING vertical', async () => {
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          success: true,
          safe_date: {
            user_id: 11,
            score: 62,
            breakdown: {
              identity_verified_points: 25,
              liveness_points: 15,
              background_clean_points: 2,
              cross_platform_reputation_points: 10,
              social_validation_points: 6,
              harassment_free_points: 4,
            },
            computed_at: new Date().toISOString(),
            reason_codes: ['background_flags_present'],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
  });

  const result = await sdk.verify({ subjectDid: 'did:cred:holder:11', vertical: 'DATING', requiredScore: 70 });
  assert.equal(result.score, 62);
  assert.equal(result.recommendation, 'REVIEW');
  assert.equal(result.confidence, 'LOW');
});

test('generateProof hits issuer proof contract path and returns contract payload', async () => {
  let seenPath = '';
  const sdk = new CredVerse({
    baseUrl: 'https://issuer.credverse.test',
    apiKey: 'issuer-key',
    fetchImpl: async (input, init) => {
      seenPath = String(input);
      assert.equal(init?.method, 'POST');
      assert.equal(init?.headers.get('x-api-key'), 'issuer-key');

      return new Response(
        JSON.stringify({
          id: 'proof_123',
          status: 'generated',
          format: 'sd-jwt-vc',
          proof: { vp_token: 'token' },
          created_at: new Date().toISOString(),
          code: 'PROOF_GENERATED',
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const result = await sdk.generateProof({ format: 'sd-jwt-vc', subject_did: 'did:cred:holder:42' });
  assert.ok(seenPath.endsWith('/api/v1/proofs/generate'));
  assert.equal(result.code, 'PROOF_GENERATED');
  assert.equal(result.status, 'generated');
});

test('verifyProof uses recruiter proof endpoint contract', async () => {
  let seenPath = '';
  const sdk = new CredVerse({
    baseUrl: 'https://recruiter.credverse.test',
    fetchImpl: async (input) => {
      seenPath = String(input);
      return new Response(
        JSON.stringify({
          id: 'verify_123',
          valid: true,
          decision: 'approve',
          reason_codes: ['VC_VALID'],
          checked_at: new Date().toISOString(),
          code: 'PROOF_VERIFIED',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const result = await sdk.verifyProof({ format: 'sd-jwt-vc', proof: 'eyJ...' });
  assert.ok(seenPath.endsWith('/v1/proofs/verify'));
  assert.equal(result.valid, true);
  assert.equal(result.code, 'PROOF_VERIFIED');
});

test('getProofMetadata sends canonical contract fields for recruiter metadata endpoint', async () => {
  let body = null;
  const sdk = new CredVerse({
    baseUrl: 'https://recruiter.credverse.test',
    fetchImpl: async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          hash: '0xabc',
          hash_algorithm: 'sha256',
          canonicalization: 'json-stable-v1',
          proof_version: '1.0',
          checked_at: new Date().toISOString(),
          code: 'PROOF_METADATA_READY',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const result = await sdk.getProofMetadata({
    credential: { id: 'vc1' },
    hashAlgorithm: 'sha256',
    canonicalization: 'json-stable-v1',
  });

  assert.deepEqual(body, {
    credential: { id: 'vc1' },
    hash_algorithm: 'sha256',
    canonicalization: 'json-stable-v1',
  });
  assert.equal(result.code, 'PROOF_METADATA_READY');
});

test('request surfaces recruiter/issuer contract errors for root-cause handling', async () => {
  const sdk = new CredVerse({
    baseUrl: 'https://issuer.credverse.test',
    fetchImpl: async () =>
      new Response(JSON.stringify({ message: 'Credential not found', code: 'PROOF_CREDENTIAL_NOT_FOUND' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
  });

  await assert.rejects(
    () => sdk.getRevocationWitness('missing-credential'),
    /CredVerse API error 404: \{"message":"Credential not found","code":"PROOF_CREDENTIAL_NOT_FOUND"\}/,
  );
});

// ---------------------------------------------------------------------------
// Decision threshold boundary tests
// ---------------------------------------------------------------------------

function reputationFetch(rawScore) {
  return async () =>
    new Response(
      JSON.stringify({
        success: true,
        reputation: {
          user_id: 1,
          score: rawScore,
          event_count: 5,
          category_breakdown: [],
          computed_at: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
}

test('verify decision: exact requiredScore yields APPROVE', async () => {
  // score 700/1000 = normalized 70; requiredScore 70 → APPROVE
  const sdk = new CredVerse({ baseUrl: 'https://api.credverse.test', fetchImpl: reputationFetch(700) });
  const result = await sdk.verify({ userId: 1, vertical: 'OVERALL', requiredScore: 70 });
  assert.equal(result.score, 70);
  assert.equal(result.recommendation, 'APPROVE');
});

test('verify decision: one point below requiredScore yields REVIEW', async () => {
  // score 690/1000 = 69; requiredScore=70; review floor=max(50,55)=55; 69>=55 → REVIEW
  const sdk = new CredVerse({ baseUrl: 'https://api.credverse.test', fetchImpl: reputationFetch(690) });
  const result = await sdk.verify({ userId: 1, vertical: 'OVERALL', requiredScore: 70 });
  assert.equal(result.score, 69);
  assert.equal(result.recommendation, 'REVIEW');
});

test('verify decision: at review floor yields REVIEW', async () => {
  // requiredScore=70; review floor=max(50,55)=55; score=55 → REVIEW
  const sdk = new CredVerse({ baseUrl: 'https://api.credverse.test', fetchImpl: reputationFetch(550) });
  const result = await sdk.verify({ userId: 1, vertical: 'OVERALL', requiredScore: 70 });
  assert.equal(result.score, 55);
  assert.equal(result.recommendation, 'REVIEW');
});

test('verify decision: one below review floor yields REJECT', async () => {
  // requiredScore=70; review floor=55; score=54 → REJECT
  const sdk = new CredVerse({ baseUrl: 'https://api.credverse.test', fetchImpl: reputationFetch(540) });
  const result = await sdk.verify({ userId: 1, vertical: 'OVERALL', requiredScore: 70 });
  assert.equal(result.score, 54);
  assert.equal(result.recommendation, 'REJECT');
});

test('verify decision: default requiredScore is 70', async () => {
  const sdk = new CredVerse({ baseUrl: 'https://api.credverse.test', fetchImpl: reputationFetch(1000) });
  const result = await sdk.verify({ userId: 1, vertical: 'HIRING' });
  assert.equal(result.requiredScore, 70);
  assert.equal(result.recommendation, 'APPROVE');
});

test('verify confidence: HIGH for score >= 85', async () => {
  const sdk = new CredVerse({ baseUrl: 'https://api.credverse.test', fetchImpl: reputationFetch(860) });
  const result = await sdk.verify({ userId: 1, vertical: 'GIG' });
  assert.equal(result.confidence, 'HIGH');
});

test('verify confidence: MEDIUM for score 65-84', async () => {
  const sdk = new CredVerse({ baseUrl: 'https://api.credverse.test', fetchImpl: reputationFetch(700) });
  const result = await sdk.verify({ userId: 1, vertical: 'GIG' });
  assert.equal(result.confidence, 'MEDIUM');
});

test('verify confidence: LOW for score < 65', async () => {
  const sdk = new CredVerse({ baseUrl: 'https://api.credverse.test', fetchImpl: reputationFetch(600) });
  const result = await sdk.verify({ userId: 1, vertical: 'GIG' });
  assert.equal(result.confidence, 'LOW');
});
