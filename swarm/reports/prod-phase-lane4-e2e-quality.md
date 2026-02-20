# Prod Phase — Lane 4 E2E Quality (Issuer → Wallet → Recruiter + Revocation)

Date: 2026-02-21 (IST)
Repo: `/Users/raghav/Desktop/credity`

## Scope
- Verify end-to-end workflows for:
  - issuer -> wallet -> recruiter
  - revocation/status propagation paths
- Stabilize flaky/broken E2E points
- Produce reproducible command set + observed results

## What I changed

### 1) Stabilized revocation propagation logic (deterministic fallback + explicit codes)
**File:** `CredVerseRecruiter/server/services/verification-engine.ts`

Updated `checkRevocation()` to:
- Probe issuer revocation status using ordered candidates:
  1. `GET /api/v1/credentials/:id/status`
  2. `GET /api/v1/verify/:id`
- Return explicit **failed** outcome for issuer `404`:
  - `details.code = ISSUER_CREDENTIAL_NOT_FOUND`
  - mark `revoked: true`
- Return explicit status codes in details:
  - `REVOCATION_CONFIRMED` (active)
  - `CREDENTIAL_REVOKED` (revoked)
  - `REVOCATION_STATUS_UNKNOWN` (issuer unreachable)
  - `REVOCATION_INPUT_MISSING` (no id/jwt)

This removed ambiguity and aligned runtime behavior with revocation risk semantics.

---

### 2) Repaired cross-service E2E test drift
**File:** `CredVerseRecruiter/tests/e2e-issuer-wallet-verifier.test.ts`

The test previously depended on outdated recruiter routes (`/api/v1/proofs/*`) and outdated bearer expectations.

Updated to current API contract:
- Keep issuer auth permutations:
  - no auth -> 401
  - invalid API key -> 401
  - API key happy path -> success
  - bearer path currently returns 403 (template policy lock)
- Replace stale proof endpoints with current recruiter endpoint:
  - `POST /api/v1/verifications/instant`
- Assert deterministic auth behavior:
  - no token -> 401
  - invalid token -> 401
- Assert successful verification response shape:
  - `verification_id`, `credential_validity`, `status_validity`, `decision`, `checks`
- Add bad-input check (`{}` body) -> 400

This made the E2E suite robust against route drift and policy evolution.

---

### 3) Added missing dependency for cross-service E2E harness imports
**Files:**
- `CredVerseRecruiter/package.json`
- `CredVerseRecruiter/package-lock.json`

Because recruiter E2E imports wallet routes/services in-process, recruiter test env needed modules used by wallet auth/scanner code paths.
Installed dev deps:
- `passport-google-oauth20`
- `@google-cloud/vision`
- `@google/generative-ai`

---

### 4) Added reproducible lane command at repo root
**File:** `package.json`

Added script:
- `test:lane4:e2e`

Command:
```bash
npm run test:lane4:e2e
```

It runs the two stabilized lane-4 suites in recruiter:
- `tests/e2e-issuer-wallet-verifier.test.ts`
- `tests/revocation-status-propagation.test.ts`

## Reproducible command set + results

### A. Primary lane-4 quality gate (recommended)
```bash
cd /Users/raghav/Desktop/credity
npm run test:lane4:e2e
```

**Observed result:** PASS
- Test Files: 2 passed
- Tests: 5 passed

---

### B. Individual test execution
```bash
cd /Users/raghav/Desktop/credity/CredVerseRecruiter
npm test -- tests/revocation-status-propagation.test.ts
npm test -- tests/e2e-issuer-wallet-verifier.test.ts
```

**Observed result:** both PASS

---

### C. Full local foundation gate orchestration (informational)
```bash
cd /Users/raghav/Desktop/credity
npm run gate:foundation:local
```

**Observed result:** FAIL in current environment
- Issuer service failed to become healthy due DB host resolution error:
  - `getaddrinfo ENOTFOUND db.oldkyalswxuretmoovvj.supabase.co`
- Orchestrator exits after health timeout.

This is an environment/infrastructure dependency blocker, not a lane-4 recruiter test regression.

## Flaky points found + stabilization summary

1. **Revocation behavior mismatch (test vs runtime)**
   - Symptom: expected fallback/404 semantics failed.
   - Fix: explicit endpoint fallback order + explicit revocation codes.

2. **Cross-service import fragility in in-process E2E**
   - Symptom: missing package errors when recruiter imports wallet route graph.
   - Fix: install required wallet-related modules in recruiter test environment.

3. **API drift in verifier endpoints**
   - Symptom: test called obsolete `/api/v1/proofs/*` endpoints.
   - Fix: migrated test assertions to `/api/v1/verifications/instant` contract.

## Notes for follow-up
- `CredVerseIssuer 3/tests/e2e/credential-flow.spec.ts` is Playwright-style but excluded by issuer vitest config (`exclude: tests/e2e/**`).
- If UI-level browser E2E is required for production readiness, add dedicated Playwright config/runner and run it separately from vitest API suites.

## Net outcome
- Lane-4 targeted E2E + revocation quality checks are now reproducible and passing via one root command.
- Revocation path has stronger deterministic handling and clearer failure semantics.
- Infrastructure-dependent full local gate still needs DB/network environment correction.