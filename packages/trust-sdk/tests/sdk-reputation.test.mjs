import test from 'node:test';
import assert from 'node:assert/strict';
import { CredVerse } from '../dist/index.js';

test('getReputationScore includes subjectDid and userId in query when userId given', async () => {
  let seenSearch = '';
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async (input) => {
      seenSearch = new URL(String(input)).search;
      return new Response(
        JSON.stringify({
          success: true,
          reputation: {
            user_id: 5,
            score: 600,
            event_count: 10,
            category_breakdown: [],
            computed_at: new Date().toISOString(),
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const result = await sdk.getReputationScore({ userId: 5, vertical: 'OVERALL' });
  assert.equal(result.score, 600);
  assert.ok(seenSearch.includes('subjectDid=5'), `Expected subjectDid=5 in ${seenSearch}`);
  assert.ok(seenSearch.includes('userId=5'), `Expected userId=5 in ${seenSearch}`);
});

test('getReputationScore prefers subjectDid over userId when both provided', async () => {
  let seenSearch = '';
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async (input) => {
      seenSearch = new URL(String(input)).search;
      return new Response(
        JSON.stringify({
          success: true,
          reputation: {
            user_id: 99,
            score: 750,
            event_count: 5,
            category_breakdown: [],
            computed_at: new Date().toISOString(),
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  await sdk.getReputationScore({ userId: 99, subjectDid: 'did:cred:holder:abc', vertical: 'HIRING' });
  assert.ok(
    seenSearch.includes('subjectDid=did%3Acred%3Aholder%3Aabc'),
    `Expected encoded subjectDid in ${seenSearch}`,
  );
});

test('getReputationScore maps TrustVertical to backend snake_case slug', async () => {
  const verticalCases = [
    ['HIRING', 'work'],
    ['DATING', 'safe_date'],
    ['GIG', 'gig'],
    ['OVERALL', 'overall'],
  ];

  for (const [vertical, expectedSlug] of verticalCases) {
    let seenSearch = '';
    const sdk = new CredVerse({
      baseUrl: 'https://api.credverse.test',
      fetchImpl: async (input) => {
        seenSearch = new URL(String(input)).search;
        return new Response(
          JSON.stringify({
            success: true,
            reputation: { user_id: 1, score: 500, event_count: 1, category_breakdown: [], computed_at: new Date().toISOString() },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      },
    });
    await sdk.getReputationScore({ userId: 1, vertical });
    assert.ok(
      seenSearch.includes(`vertical=${expectedSlug}`),
      `Vertical ${vertical}: expected slug '${expectedSlug}' in '${seenSearch}'`,
    );
  }
});

test('ingestReputationEvent posts correctly formatted body to /v1/reputation/events', async () => {
  let seenPath = '';
  let seenBody = null;
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async (input, init) => {
      seenPath = new URL(String(input)).pathname;
      seenBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({ success: true, event: { id: 'evt_1' } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  const result = await sdk.ingestReputationEvent({
    eventId: 'evt-abc',
    userId: 7,
    platformId: 'uber',
    category: 'transport',
    signalType: 'ride_completed',
    score: 80,
    occurredAt: '2024-01-01T00:00:00.000Z',
  });

  assert.equal(seenPath, '/v1/reputation/events');
  assert.equal(seenBody.event_id, 'evt-abc');
  assert.equal(seenBody.user_id, 7);
  assert.equal(seenBody.subject_did, '7');
  assert.equal(seenBody.platform_id, 'uber');
  assert.equal(seenBody.category, 'transport');
  assert.equal(seenBody.signal_type, 'ride_completed');
  assert.equal(seenBody.score, 80);
  assert.equal(result.success, true);
});

test('ingestReputationEvent uses subjectDid directly when provided', async () => {
  let seenBody = null;
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async (_input, init) => {
      seenBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({ success: true, event: {} }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  await sdk.ingestReputationEvent({
    subjectDid: 'did:cred:holder:xyz',
    platformId: 'swiggy',
    category: 'delivery',
    signalType: 'delivery_completed',
    score: 90,
  });

  assert.equal(seenBody.subject_did, 'did:cred:holder:xyz');
});

test('ingestReputationEvent throws when neither subjectDid nor userId provided', async () => {
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
  });

  await assert.rejects(
    () => sdk.ingestReputationEvent({ platformId: 'uber', category: 'transport', signalType: 'x', score: 80 }),
    /Either subjectDid or userId is required/,
  );
});

test('getReputationScore throws when neither subjectDid nor userId provided', async () => {
  const sdk = new CredVerse({
    baseUrl: 'https://api.credverse.test',
    fetchImpl: async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
  });

  await assert.rejects(
    () => sdk.getReputationScore({ vertical: 'OVERALL' }),
    /Either subjectDid or userId is required/,
  );
});
