# @credverse/trust

SDK-first Trust API client for the Credity Reputation Rail. Provides verified trust scores, reputation events, ZK proofs, and selective credential disclosure.

## Installation

```bash
# In the monorepo
cd packages/trust-sdk && npm install && npm run build

# From another workspace package
npm install @credverse/trust
```

## Quick Start

```typescript
import { CredVerse } from '@credverse/trust';

const sdk = new CredVerse({
  baseUrl: 'https://your-credverse-host.example.com',
  apiKey: process.env.CREDVERSE_API_KEY,
});

const result = await sdk.verify({ userId: 42, vertical: 'HIRING', requiredScore: 75 });
console.log(result.recommendation); // 'APPROVE' | 'REVIEW' | 'REJECT'
```

## Constructor Options

```typescript
new CredVerse(options: CredVerseClientOptions)
```

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `baseUrl` | `string` | Yes | — | Base URL of the CredVerse gateway (no trailing slash) |
| `apiKey` | `string` | No | — | API key sent as `x-api-key` header on every request |
| `timeoutMs` | `number` | No | `10000` | Request abort timeout in milliseconds |
| `fetchImpl` | `typeof fetch` | No | global `fetch` | Custom fetch implementation (useful for tests/React Native) |

## Trust Verticals

| Vertical | Scoring source | Use case |
|---|---|---|
| `OVERALL` | Weighted reputation events | General identity trust |
| `HIRING` | Employment category events | Recruitment, background checks |
| `DATING` | SafeDate score (separate model) | Dating-app safety verification |
| `GIG` | Gig-economy events | On-demand work platforms |
| `RENTAL` | Accommodation category | Short-term rental platforms |
| `FINANCE` | Finance category | Credit / lending signals |
| `IDENTITY` | Identity category | KYC-lite flows |
| `EDUCATION` | — | Academic verification |
| `HEALTH` | — | Healthcare access |

## Methods

### `verify(input)`

Unified verification entry point. Returns a normalised score (0–100), a decision, and optionally a ZK proof.

```typescript
const result = await sdk.verify({
  userId: 42,            // numeric user ID — resolved to subjectDid internally
  subjectDid: 'did:cred:holder:abc', // DID — takes precedence over userId
  vertical: 'HIRING',
  requiredScore: 75,     // default: 70
  includeZkProof: true,  // default: false — attaches SD-JWT-VC proof when true
});

// result shape:
// {
//   vertical: 'HIRING',
//   score: 80,           // normalised 0–100
//   normalizedScore: 80,
//   requiredScore: 75,
//   recommendation: 'APPROVE', // 'APPROVE' | 'REVIEW' | 'REJECT'
//   confidence: 'HIGH',         // 'HIGH' (>=85) | 'MEDIUM' (>=65) | 'LOW'
//   zkProof: { id, status, format, proof, ... } | null,
//   raw: ReputationScoreContract | SafeDateScoreContract,
// }
```

**Decision thresholds** (relative to `requiredScore R`):
- `APPROVE` — score ≥ R
- `REVIEW` — score ≥ max(50, R − 15) and score < R
- `REJECT` — score < max(50, R − 15)

The `DATING` vertical uses `getSafeDateScore()` directly (score already on 0–100 scale). All other verticals use `getReputationScore()` and normalise: `(rawScore / 1000) * 100`.

### `getReputationScore(params)`

Fetch the reputation score for a given vertical.

```typescript
const score = await sdk.getReputationScore({
  userId: 42,       // or subjectDid — one is required
  vertical: 'GIG',
});
// score.score is 0–1000; normalised to 0–100 by verify()
```

### `getSafeDateScore(params)`

Fetch the SafeDate score (used automatically by `verify` for the `DATING` vertical).

```typescript
const safe = await sdk.getSafeDateScore({ userId: 42 });
// safe.breakdown: {
//   identity_verified_points, liveness_points, background_clean_points,
//   cross_platform_reputation_points, social_validation_points, harassment_free_points
// }
// safe.reason_codes: string[]
```

### `ingestReputationEvent(payload)`

Submit a reputation signal from an authorised platform.

```typescript
await sdk.ingestReputationEvent({
  eventId: 'evt-uuid',       // optional idempotency key
  userId: 42,                // or subjectDid — one is required
  platformId: 'uber',
  category: 'transport',     // ReputationCategoryContract
  signalType: 'ride_completed',
  score: 85,                 // signal score 0–100
  occurredAt: '2024-06-01T12:00:00Z',
  metadata: { tripId: 'T-999' },
});
```

### `generateProof(payload)`

Generate a cryptographic proof for a credential.

```typescript
const proof = await sdk.generateProof({
  format: 'sd-jwt-vc',           // 'sd-jwt-vc' | 'jwt_vp' | 'ldp_vp' | 'merkle-membership'
  subject_did: 'did:cred:holder:abc',
  proof_purpose: 'assertionMethod',
  challenge: 'random-nonce',
  disclosure_frame: { name: true, dob: false },
});
// proof.status: 'generated' | 'queued' | 'unsupported' | 'failed'
// proof.proof: string | object | null
```

### `verifyProof(payload)`

Verify a received proof.

```typescript
const verification = await sdk.verifyProof({
  format: 'sd-jwt-vc',
  proof: receivedToken,
  expected_issuer_did: 'did:cred:issuer:1',
  expected_subject_did: 'did:cred:holder:abc',
  expected_claims: { name: 'Alice' },
});
// verification.valid: boolean
// verification.decision: 'approve' | 'review' | 'reject'
// verification.reason_codes: string[]
// verification.extracted_claims?: Record<string, unknown>
```

### `getRevocationWitness(credentialId)`

Check the on-chain revocation status of a credential.

```typescript
const witness = await sdk.getRevocationWitness('vc-uuid-123');
// witness.revoked: boolean
// witness.status_list: { list_id, index, revoked, updated_at? } | null
// witness.anchor_proof: { batch_id, root, proof[] } | null
```

### `getReputationProfile(subjectDid)`

Fetch the full multi-vertical reputation profile for a DID.

```typescript
const profile = await sdk.getReputationProfile('did:cred:holder:abc');
// profile.scores: ReputationScoreContract[]  (one per vertical)
// profile.signals?: Record<string, unknown>
```

### `createShareGrant(payload)` / `revokeShareGrant(id)`

Control third-party access to a subject's reputation data.

```typescript
const { grant } = await sdk.createShareGrant({
  subjectDid: 'did:cred:holder:abc',
  granteeId: 'recruiter-platform-id',
  purpose: 'employment_verification',
  dataElements: ['score', 'category_breakdown'],
  expiresAt: '2025-01-01T00:00:00Z',
});

await sdk.revokeShareGrant(grant.id);
```

## Error Handling

All methods throw `Error` with message `CredVerse API error <status>: <body>` on non-2xx responses. Timeout aborts throw `AbortError`.

```typescript
try {
  await sdk.verify({ userId: 42, vertical: 'HIRING' });
} catch (err) {
  if (err.name === 'AbortError') {
    console.error('Request timed out');
  } else {
    console.error(err.message); // e.g. "CredVerse API error 404: ..."
  }
}
```

## Running Tests

Tests require the SDK to be built first:

```bash
npm run build
npm test
```

Tests use Node.js built-in `node:test` runner with a mocked `fetchImpl` — no network access is required.
