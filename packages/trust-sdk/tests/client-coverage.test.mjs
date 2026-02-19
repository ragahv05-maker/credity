/* global Response, URL */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CredVerse } from '../dist/index.js';

test('verify maps reputation score >= requiredScore to APPROVE decision', async () => {
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          success: true,
          reputation: {
            user_id: 1,
            subject_did: 'did:cred:holder:1',
            score: 750, // 75 normalized
            event_count: 10,
            category_breakdown: [],
            computed_at: new Date().toISOString(),
            vertical: 'overall',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
  });

  const result = await sdk.verify({ subjectDid: 'did:cred:holder:1', vertical: 'OVERALL', requiredScore: 70 });

  assert.equal(result.score, 75);
  assert.equal(result.normalizedScore, 75);
  assert.equal(result.recommendation, 'APPROVE');
});

test('verify maps reputation score just below requiredScore to REVIEW decision (within threshold)', async () => {
  // Threshold is max(50, requiredScore - 15). For 70, threshold is 55.
  // Normalized 60 is < 70 but >= 55.
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          success: true,
          reputation: {
            user_id: 1,
            subject_did: 'did:cred:holder:1',
            score: 600, // 60 normalized
            event_count: 10,
            category_breakdown: [],
            computed_at: new Date().toISOString(),
            vertical: 'overall',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
  });

  const result = await sdk.verify({ subjectDid: 'did:cred:holder:1', vertical: 'OVERALL', requiredScore: 70 });

  assert.equal(result.score, 60);
  assert.equal(result.recommendation, 'REVIEW');
});

test('verify maps reputation score below threshold to REJECT decision', async () => {
  // Threshold is max(50, requiredScore - 15). For 70, threshold is 55.
  // Normalized 50 is < 55.
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          success: true,
          reputation: {
            user_id: 1,
            subject_did: 'did:cred:holder:1',
            score: 500, // 50 normalized
            event_count: 10,
            category_breakdown: [],
            computed_at: new Date().toISOString(),
            vertical: 'overall',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
  });

  const result = await sdk.verify({ subjectDid: 'did:cred:holder:1', vertical: 'OVERALL', requiredScore: 70 });

  assert.equal(result.score, 50);
  assert.equal(result.recommendation, 'REJECT');
});

test('verify assigns confidence levels correctly based on normalized score', async () => {
  const mockFetch = (score) => async () =>
    new Response(
      JSON.stringify({
        success: true,
        reputation: {
          user_id: 1,
          subject_did: 'did:cred:holder:1',
          score: score,
          event_count: 10,
          category_breakdown: [],
          computed_at: new Date().toISOString(),
          vertical: 'overall',
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );

  // HIGH: >= 85 normalized (850 raw)
  let sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: mockFetch(850),
  });
  let result = await sdk.verify({ subjectDid: 'did:cred:holder:1', vertical: 'OVERALL', requiredScore: 70 });
  assert.equal(result.confidence, 'HIGH');

  // MEDIUM: >= 65 normalized (650 raw)
  sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: mockFetch(650),
  });
  result = await sdk.verify({ subjectDid: 'did:cred:holder:1', vertical: 'OVERALL', requiredScore: 70 });
  assert.equal(result.confidence, 'MEDIUM');

  // LOW: < 65 normalized (640 raw)
  sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: mockFetch(640),
  });
  result = await sdk.verify({ subjectDid: 'did:cred:holder:1', vertical: 'OVERALL', requiredScore: 70 });
  assert.equal(result.confidence, 'LOW');
});

test('verify clamps scores greater than 100 to 100', async () => {
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          success: true,
          reputation: {
            user_id: 1,
            subject_did: 'did:cred:holder:1',
            score: 1500, // 150 normalized -> clamped to 100
            event_count: 10,
            category_breakdown: [],
            computed_at: new Date().toISOString(),
            vertical: 'overall',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
  });

  const result = await sdk.verify({ subjectDid: 'did:cred:holder:1', vertical: 'OVERALL', requiredScore: 70 });

  assert.equal(result.score, 100);
  assert.equal(result.normalizedScore, 100);
});

test('verify clamps scores less than 0 to 0', async () => {
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          success: true,
          reputation: {
            user_id: 1,
            subject_did: 'did:cred:holder:1',
            score: -500, // -50 normalized -> clamped to 0
            event_count: 10,
            category_breakdown: [],
            computed_at: new Date().toISOString(),
            vertical: 'overall',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
  });

  const result = await sdk.verify({ subjectDid: 'did:cred:holder:1', vertical: 'OVERALL', requiredScore: 70 });

  assert.equal(result.score, 0);
  assert.equal(result.normalizedScore, 0);
});

test('ingestReputationEvent sends correct payload', async () => {
  let requestBody;
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async (url, init) => {
      requestBody = JSON.parse(init.body);
      return new Response(
        JSON.stringify({ success: true, event: { id: 'evt_123' } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const payload = {
    eventId: 'evt_1',
    userId: 123,
    subjectDid: 'did:cred:holder:123',
    platformId: 'plat_1',
    category: 'payment',
    signalType: 'positive',
    score: 10,
    occurredAt: new Date().toISOString(),
    metadata: { ref: 'tx_1' },
  };

  await sdk.ingestReputationEvent(payload);

  assert.equal(requestBody.event_id, payload.eventId);
  assert.equal(requestBody.user_id, payload.userId);
  assert.equal(requestBody.subject_did, payload.subjectDid);
  assert.equal(requestBody.score, payload.score);
});

test('createShareGrant sends correct payload', async () => {
  let requestBody;
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async (url, init) => {
      requestBody = JSON.parse(init.body);
      return new Response(
        JSON.stringify({ success: true, grant: { id: 'grant_123' } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const payload = {
    subjectDid: 'did:cred:holder:123',
    granteeId: 'grantee_1',
    purpose: 'loan_app',
    dataElements: ['score', 'history'],
    expiresAt: new Date().toISOString(),
  };

  await sdk.createShareGrant(payload);

  assert.equal(requestBody.subject_did, payload.subjectDid);
  assert.equal(requestBody.grantee_id, payload.granteeId);
  assert.deepEqual(requestBody.data_elements, payload.dataElements);
});

test('revokeShareGrant sends correct request', async () => {
  let seenUrl;
  let seenMethod;
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async (url, init) => {
      seenUrl = url;
      seenMethod = init.method;
      return new Response(
        JSON.stringify({ success: true, grant: { status: 'revoked' } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const grantId = 'grant_123';
  await sdk.revokeShareGrant(grantId);

  assert.ok(seenUrl.endsWith(`/v1/reputation/share-grants/${grantId}/revoke`));
  assert.equal(seenMethod, 'POST');
});

test('getReputationProfile fetches correct endpoint', async () => {
  let seenUrl;
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async (url) => {
      seenUrl = url;
      return new Response(
        JSON.stringify({ success: true, profile: { subject_did: 'did:cred:holder:1' } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const subjectDid = 'did:cred:holder:1';
  await sdk.getReputationProfile(subjectDid);

  assert.ok(seenUrl.endsWith(`/v1/reputation/profiles/${encodeURIComponent(subjectDid)}`));
});

test('getVerificationSummary fetches correct endpoint with query params', async () => {
  let seenUrl;
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async (url) => {
      seenUrl = url;
      return new Response(
        JSON.stringify({ success: true, candidate_summary: { user_id: 123 } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  await sdk.getVerificationSummary({ userId: 123, subjectDid: 'did:cred:holder:123' });

  const urlObj = new URL(seenUrl);
  assert.equal(urlObj.pathname, '/v1/reputation/summary');
  assert.equal(urlObj.searchParams.get('userId'), '123');
  assert.equal(urlObj.searchParams.get('subjectDid'), 'did:cred:holder:123');
});
