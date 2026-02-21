# Credity Swarm S03 — CredVerseRecruiter verification/proof hardening

## Scope completed

Focused only on **CredVerseRecruiter** proof/verification route hardening for:

- authorization behavior (proof routes)
- input validation (strict payload checks)
- replay safety (proof replay guard)
- regression tests

## Changes made

### 1) Hardened proof route input validation

File: `CredVerseRecruiter/server/routes/verification.ts`

- Added zod-backed validation for `/api/v1/proofs/verify` payloads:
  - validates `format`, `proof`, `challenge`, `domain`
  - validates DID-like inputs for `expected_issuer_did` / `expected_subject_did`
  - validates `revocation_witness` shape
  - validates optional hash inputs (`expected_hash`, `hash_algorithm`)
- Added zod validation for `/api/v1/proofs/metadata` payloads.
- Added payload size guard (`MAX_PROOF_BYTES`) for metadata credential body.

### 2) Replay safety for proof verification

File: `CredVerseRecruiter/server/routes/verification.ts`

- Added in-memory replay cache with TTL (`PROOF_REPLAY_TTL_MS`, default 10m).
- Added deterministic replay fingerprinting using:
  - proof format
  - challenge
  - domain
  - proof digest
- Enforced replay detection (`409`, code: `PROOF_REPLAY_DETECTED`) when challenge/domain-bound proof payload repeats.
- Replay protection is challenge/domain scoped to avoid breaking legacy idempotent verify behavior that does not bind to challenge/domain.

### 3) Authorization behavior preserved/verified

- Existing role gate `requireProofAccess` remains enforced for proof endpoints.
- Unauthorized and forbidden paths continue returning explicit proof auth error codes.

### 4) Regression tests added/updated

File: `CredVerseRecruiter/tests/proof-lifecycle.test.ts`

Added/updated tests for:

- invalid DID input rejection on proof verify (`PROOF_INPUT_INVALID`)
- replay blocking on identical challenge/domain-bound proof payload (`PROOF_REPLAY_DETECTED`)
- oversized metadata payload rejection path
- compatibility updates for accepted proof format usage in tests (`ldp_vp` where applicable)
- hash mismatch test aligned with stricter request validation

## Verification runs

### Typecheck

- Ran: `npm run check`
- Result: **PASS**

### Targeted recruiter proof tests

- Ran: `npm test -- tests/proof-lifecycle.test.ts`
- Result: **PASS** (13/13)

### Full recruiter test suite

- Ran: `npm test`
- Result: **FAIL** (1 failing test, 33 passing)
- Failing test:
  - `tests/e2e-issuer-wallet-verifier.test.ts`
  - `covers blockchain proof modes deterministically (active, deferred, writes-disabled)`
  - Failure observed: `TypeError: Cannot read properties of null (reading 'deferred')`
- Notes:
  - This failure is in blockchain proof-mode e2e path and not in the proof route hardening regression scope.

## Files touched

- `CredVerseRecruiter/server/routes/verification.ts`
- `CredVerseRecruiter/tests/proof-lifecycle.test.ts`
