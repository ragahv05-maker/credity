# S16 — Revocation/Status Propagation Consistency (Issuer ↔ Recruiter)

## Scope completed

Improved revocation/status propagation behavior in recruiter verification flow, and aligned issuer revocation route behavior for idempotent status signaling.

## Changes made

### 1) Recruiter: robust issuer revocation status resolution + error mapping

**File:** `CredVerseRecruiter/server/services/verification-engine.ts`

Updated `checkRevocation()` to:

- Query issuer status using a **consistent two-step path**:
  1. `/api/v1/credentials/:id/status`
  2. fallback `/api/v1/verify/:id`
- Normalize revocation interpretation from either shape (`revoked` or inverse of `valid`).
- Return explicit mapped outcomes/codes in `details.code`:
  - `REVOCATION_ID_MISSING`
  - `ISSUER_CREDENTIAL_NOT_FOUND` (404)
  - `ISSUER_STATUS_FORBIDDEN` (401/403)
  - `REVOKED_CREDENTIAL`
  - `REVOCATION_CONFIRMED`
  - `ISSUER_STATUS_UNAVAILABLE`
- Keep behavior idempotent/deterministic for repeated verification checks with the same upstream state.

### 2) Issuer: idempotent revocation response includes status payload consistency

**File:** `CredVerseIssuer 3/server/routes/issuance.ts`

Updated revocation handler to fetch status on duplicate revocations and include status payload consistently:

- imported `getCredentialStatus`
- for already-revoked paths, now resolves status via `getCredentialStatus`
- for fresh revocations, resolves status via `revokeCredentialStatus`
- returns status object with `list_id/index/revoked` when available

> Note: standards route already had similar behavior; this aligns issuance route logic so both paths are consistent.

## Tests added

### Recruiter tests

**File:** `CredVerseRecruiter/tests/revocation-status-propagation.test.ts`

Added coverage for:

1. Fallback behavior from issuer status endpoint failure (500) to verify endpoint (200 active)
   - asserts revocation check becomes `passed`
   - asserts code `REVOCATION_CONFIRMED`
2. Explicit mapping for issuer 404
   - asserts revocation check becomes `failed`
   - asserts code `ISSUER_CREDENTIAL_NOT_FOUND`
   - asserts risk flag contains `REVOKED_CREDENTIAL`

## Test run evidence

Executed:

- `cd CredVerseRecruiter && npm test -- tests/revocation-status-propagation.test.ts`

Result:

- **PASS** (2 tests)
