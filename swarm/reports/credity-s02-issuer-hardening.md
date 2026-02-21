# Credity Swarm S02 — CredVerseIssuer 3 Security/Auth/Queue/Revocation Hardening

## Scope Completed

Focused only on **CredVerseIssuer 3** hardening for:

- role checks
- idempotent/consistent semantics
- machine-readable error consistency
- targeted tests + issuer test/check execution

## Changes Implemented

### 1) Auth middleware machine-readable error consistency

**File:** `CredVerseIssuer 3/server/auth.ts`

Aligned API-key branch responses in `apiKeyOrAuthMiddleware` and `apiKeyMiddleware`:

- `401` now consistently returns `code: "AUTH_UNAUTHORIZED"`
- `429` now consistently returns `code: "AUTH_RATE_LIMITED"`
- `requireAuth` now returns `code: "AUTH_UNAUTHORIZED"`

This removes mixed human-only error payloads and keeps auth failures machine-parseable.

---

### 2) Queue authorization hardening + explicit error codes

**File:** `CredVerseIssuer 3/server/routes/issuance.ts`

Added centralized issuer/admin-or-API-key checks:

- `hasIssuerAccess(...)`
- `authorizeQueueOperations(...)`
- `authorizeIssuanceWrite(...)`

Queue routes now explicitly enforce issuer/admin role for JWT users (API key still allowed) and return:

- `403` + `code: "QUEUE_FORBIDDEN"`

Queue operational errors now include explicit codes:

- queue unavailable: `503` + `code: "QUEUE_UNAVAILABLE"`
- missing job: `404` + `code: "QUEUE_JOB_NOT_FOUND"`
- dead-letter replay failures:
  - `404` + `code: "QUEUE_DEAD_LETTER_NOT_FOUND"`
  - `500` + `code: "QUEUE_REPLAY_FAILED"`

---

### 3) Revocation/write-path role hardening

**Files:**

- `CredVerseIssuer 3/server/routes/standards.ts`
- `CredVerseIssuer 3/server/routes/issuance.ts`

Added issuer/admin-or-API-key enforcement on sensitive write operations.

In `standards.ts` (effective earlier-mounted route layer):

- Introduced:
  - `hasIssuerAccess(...)`
  - `enforceIssuerWriteAccess(...)` returning `403` + `code: "ISSUER_FORBIDDEN"`
- Applied to:
  - `POST /api/v1/oid4vci/credential-offers`
  - `POST /api/v1/credentials/:id/revoke`
  - `POST /api/v1/anchors/batches`
  - `POST /api/v1/anchors/batches/:batchId/replay`
  - `GET /api/v1/anchors/dead-letter`

Also updated proof authz guard to use shared issuer-access logic while preserving existing `PROOF_FORBIDDEN` semantics.

In `issuance.ts`, equivalent issuer write checks were also added to:

- `POST /credentials/issue`
- `POST /credentials/bulk-issue`
- `POST /credentials/:id/revoke`

This closes JWT non-issuer access to issuance/revocation writes.

---

### 4) Tests added/updated

#### Updated

**File:** `CredVerseIssuer 3/tests/queue-authorization.test.ts`

- Non-issuer JWT queue access now asserts:
  - `403`
  - `code === "QUEUE_FORBIDDEN"`
- Non-issuer dead-letter replay now asserts:
  - `403`
  - `code === "QUEUE_FORBIDDEN"`

#### Added

**File:** `CredVerseIssuer 3/tests/revocation-authorization.test.ts`

- Verifies non-issuer JWT cannot revoke credential:
  - `POST /api/v1/credentials/:id/revoke`
  - expects `403` + `code === "ISSUER_FORBIDDEN"`

Existing revocation idempotency behavior remains intact (`alreadyRevoked` + typed `RevocationError`).

## Validation Run

Working directory used: `/Users/raghav/Desktop/credity/CredVerseIssuer 3`

### Targeted hardening tests (PASS)

Command:

- `npx vitest run tests/queue-authorization.test.ts tests/revocation-idempotency.test.ts tests/revocation-authorization.test.ts tests/proof-authz.test.ts`

Result:

- **4 files passed**
- **9 tests passed**
- Exit code `0`

### Full `npm test`

- Started and progressed through multiple suites with no immediate hardening-related failures visible in streamed output.
- Process remained running (likely due non-hardening suite/open-handle behavior).

### `npm run check` (tsc)

- Command started (`tsc`) but remained running without terminal completion during this run window.

## Notes

- No functional changes were made outside CredVerseIssuer 3 scope.
- Error code additions are backward-compatible with existing `message` fields.
- Hardening keeps API-key issuer workflows working while restricting JWT users to issuer/admin roles for protected write/queue/revocation operations.
