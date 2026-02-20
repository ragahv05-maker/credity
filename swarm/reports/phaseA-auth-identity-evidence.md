# Phase A — P0 Auth + Identity Production Batch Evidence

**Repo:** `/Users/raghav/Desktop/credity12`  
**Date:** 2026-02-20  
**Branch:** `feat/phaseA-auth-identity-p0`

## Scope executed (from PRD gap matrix)
- Apple Sign-In integration path (`/api/v1/auth/apple`, callback support)
- PIN fallback auth flow (`/api/v1/auth/pin/setup`, `/api/v1/auth/pin/verify`)
- Session policy hooks for 30-day max session lifecycle (auditable evidence)
- Identity hardening: strict doc-type validator + face-match endpoint
- Hardening tests for auth/identity and benchmark harness

## Implementation summary

### 1) Auth — Apple Sign-In (functional where feasible)
Added:
- `BlockWalletDigi/server/services/apple-oauth-service.ts`
  - Authorization URL generator with state
  - Identity token payload verification checks: issuer, audience, exp, subject
- `BlockWalletDigi/server/routes/auth.ts`
  - `GET /auth/apple` → returns authorization URL/state
  - `POST /auth/apple` → validates Apple identity token, creates/links user, issues tokens
  - `GET /auth/apple/callback` → callback contract + handoff response

### 2) Auth — PIN fallback
Added:
- `BlockWalletDigi/server/services/pin-auth-service.ts`
  - PIN format validation (numeric 4–8)
  - Secure PIN hashing + verification
- `BlockWalletDigi/server/routes/auth.ts`
  - `POST /auth/pin/setup` (auth required)
  - `POST /auth/pin/verify` (fallback login path)

### 3) Auth — 30-day session policy evidence hooks
Updated:
- `BlockWalletDigi/server/services/auth-service.ts`
  - refresh-token store now tracks `sessionStartedAt` + `sessionId`
  - refresh rotation preserves original session start
  - hard reject refresh when absolute session age exceeds 30 days
  - evidence helper `getSessionPolicyEvidence()`
  - test hook `__test_backdateRefreshSession()`
- `BlockWalletDigi/server/routes/auth.ts`
  - `POST /auth/session/policy-evidence`

### 4) Identity hardening
Added:
- `BlockWalletDigi/server/services/document-type-validator-service.ts`
  - strict validators for Aadhaar, PAN, Passport, Driving License formats
- `BlockWalletDigi/server/services/face-match-service.ts`
  - cosine similarity confidence + thresholded match decision
Updated:
- `BlockWalletDigi/server/routes/identity.ts`
  - `POST /document/validate-type`
  - `POST /face-match`

## Test evidence
Executed:
```bash
cd /Users/raghav/Desktop/credity12/BlockWalletDigi
npm test -- tests/auth-apple-oauth.test.ts tests/auth-pin-fallback.test.ts tests/auth-session-30day-policy.test.ts tests/identity-doc-type-validation.test.ts tests/identity-face-match-accuracy.test.ts tests/identity-liveness-accuracy-benchmark.test.ts
```

Result:
- **6 test files passed**
- **6 tests passed**
- No failures

### Added tests
- `tests/auth-apple-oauth.test.ts`
- `tests/auth-pin-fallback.test.ts`
- `tests/auth-session-30day-policy.test.ts`
- `tests/identity-doc-type-validation.test.ts`
- `tests/identity-face-match-accuracy.test.ts`
- `tests/identity-liveness-accuracy-benchmark.test.ts`

## Endpoint evidence (grep)
```bash
rg -n "auth/apple|auth/pin|session/policy-evidence" BlockWalletDigi/server/routes/auth.ts
```
Matched lines:
- `router.get('/auth/apple'...)`
- `router.post('/auth/apple'...)`
- `router.get('/auth/apple/callback'...)`
- `router.post('/auth/pin/setup'...)`
- `router.post('/auth/pin/verify'...)`
- `router.post('/auth/session/policy-evidence'...)`

```bash
rg -n "document/validate-type|face-match" BlockWalletDigi/server/routes/identity.ts
```
Matched lines:
- `router.post('/document/validate-type'...)`
- `router.post('/face-match'...)`

## Notes / constraints
- Apple token verification implemented with claim-level validation (iss/aud/exp/sub). Full Apple JWKS signature verification can be added next for strict production cryptographic verification.
- PIN storage is currently in-memory service state; production persistence/rotation policy can be layered on storage/DB in next increment.
