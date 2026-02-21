# Production Phase — Lane 1 PRD P0 Closure Report

## Scope executed

From `swarm/reports/prd-gap-matrix-credity12.md`, implemented code-feasible P0 closures in:

- Auth/session hardening follow-ups
- Identity validator robustness
- JWKS verification hardening path (Apple identity token verification)

## Branch

- `feat/prd-p0-auth-identity-jwks-hardening`

## Changes delivered

### 1) Apple OAuth hardening with JWKS signature verification

**Files:**

- `BlockWalletDigi/server/services/apple-oauth-service.ts`
- `BlockWalletDigi/server/routes/auth.ts`
- `BlockWalletDigi/tests/auth-apple-oauth.test.ts`

**What changed:**

- Replaced insecure payload-only decode path with signed-token verification against Apple JWKS (`https://appleid.apple.com/auth/keys`).
- Enforced:
  - max token size guard
  - `alg=RS256` allowlist
  - mandatory `kid`
  - issuer/audience verification
  - key lookup with cache + forced refresh fallback
- Route updated to await async token verification.
- Added tests for:
  - valid RS256 token accepted with JWKS key
  - unknown `kid` rejected (`401`)

### 2) Identity document validator robustness

**File:**

- `BlockWalletDigi/server/services/document-type-validator-service.ts`
- `BlockWalletDigi/tests/identity-doc-type-validation.test.ts`

**What changed:**

- Added robust normalization for type and document number (case/space/hyphen handling).
- Added aliases (`aadhar`, `dl`, etc.) for resilient input parsing.
- Hardened validators and fake-pattern rejection for all-same Aadhaar digits.
- Returned normalized document number in response for observability.
- Expanded tests to cover all supported document types + malformed/unsupported payloads.

### 3) Face-match validator hardening

**Files:**

- `BlockWalletDigi/server/services/face-match-service.ts`
- `BlockWalletDigi/tests/identity-face-match-accuracy.test.ts`

**What changed:**

- Added strict threshold validation (`0..1`).
- Added embedding validation (minimum dimensionality + finite numeric values).
- Preserved cosine similarity behavior and deterministic scoring.
- Added negative-path tests for invalid threshold and malformed embeddings.

## Evidence commands + outputs

### Route evidence

```bash
rg -n "auth/apple|auth/pin|auth/session/policy-evidence|document/validate-type|face-match" BlockWalletDigi/server/routes/auth.ts BlockWalletDigi/server/routes/identity.ts
```

Output excerpt:

- `BlockWalletDigi/server/routes/auth.ts:366:router.get('/auth/apple'...`
- `BlockWalletDigi/server/routes/auth.ts:382:router.post('/auth/apple'...`
- `BlockWalletDigi/server/routes/auth.ts:607:router.post('/auth/pin/setup'...`
- `BlockWalletDigi/server/routes/auth.ts:622:router.post('/auth/pin/verify'...`
- `BlockWalletDigi/server/routes/auth.ts:654:router.post('/auth/session/policy-evidence'...`
- `BlockWalletDigi/server/routes/identity.ts:392:router.post('/document/validate-type'...`
- `BlockWalletDigi/server/routes/identity.ts:407:router.post('/face-match'...`

### Targeted test run

```bash
cd /Users/raghav/Desktop/credity/BlockWalletDigi
npm test -- tests/auth-apple-oauth.test.ts tests/auth-pin-fallback.test.ts tests/auth-session-30day-policy.test.ts tests/identity-doc-type-validation.test.ts tests/identity-face-match-accuracy.test.ts tests/identity-liveness-accuracy-benchmark.test.ts
```

Output summary:

- `Test Files  6 passed (6)`
- `Tests  9 passed (9)`
- Includes Apple OAuth JWKS validation scenarios and identity robustness coverage.

## Notes

- Local install was required in `BlockWalletDigi` to resolve missing test dependency (`passport-google-oauth20`), resulting in `BlockWalletDigi/package-lock.json` refresh.
