# Credity S31 — QA/Audit Lane Production Readiness Report

**Timestamp (IST):** 2026-02-15 03:31
**Auditor lane:** QA/Audit (independent)
**Repo path:** `/Users/raghav/Desktop/credity`

## Executive Verdict

**NO-GO (evidence-backed)** for production release in current audited state.

### Why NO-GO
1. `npm run lint` fails with **253 errors / 3 warnings** (wallet package fails first; broad repo lint debt).
2. `npm run gate:launch:strict` fails required production checks:
   - missing `REDIS_URL`
   - missing `SENTRY_DSN` / `GATEWAY_SENTRY_DSN`
   - missing `JWT_SECRET` + `JWT_REFRESH_SECRET`
3. `npm run test:sepolia-smoke` fails due missing required secret `RELAYER_PRIVATE_KEY` (or `SEPOLIA_SMOKE_RELAYER_PRIVATE_KEY`).

---

## What was executed

### 1) Root + service checks
- `npm run check` → ✅ PASS
- `npm run test` → ✅ PASS
  - Wallet tests passed
  - Issuer tests passed
  - Recruiter tests passed
  - Gateway proxy tests passed
  - Mobile tests passed
  - Contracts static + compile + tests passed (28 passing)
- `npm run gate:foundation` → ❌ FAIL (`fetch failed`; no local services)
- `npm run gate:foundation:local` → initially ❌ FAIL, then ✅ PASS after isolated gate-script fixes (documented below)
- `npm run gate:launch:strict` → ❌ FAIL (missing required production env/secrets)
- `npm run db:safety:check` → ✅ PASS with warnings (no committed migration dirs)
- `npm run test:sepolia-smoke` → ❌ FAIL (missing relayer private key secret)

---

## Failing points (exact) and disposition

### A) Foundation local gate failures (fixed in this lane)
1. **401 No token provided** when posting wallet credential in foundation gate flow
   - File: `scripts/foundation-e2e-gate.mjs`
   - Failing call: `POST /api/wallet/credentials` (without bearer auth)
   - Fix: added wallet auth bootstrap/login and bearer token usage before wallet credential POST.

2. **OID4VP nonce mismatch** during gate presentation step
   - File: `scripts/foundation-e2e-gate.mjs`
   - Failing call: `POST /api/v1/oid4vp/responses` with `vp_token` lacking required nonce/state binding.
   - Fix: changed payload to submit `credential` + bound `state` (runId), matching recruiter route contract.

Result after patch: `npm run gate:foundation:local` → ✅ PASS.

### B) Sepolia smoke test teardown regression (fixed in this lane)
- File: `CredVerseRecruiter/tests/sepolia-smoke.test.ts`
- Location: `afterAll` block (around line 65)
- Symptom: secondary `TypeError: Cannot read properties of undefined (reading 'close')` when `beforeAll` exits early due missing relayer key.
- Fix: guarded `issuerServer` existence in `afterAll` before calling `.close()`.
- Post-fix behavior: only the meaningful primary failure remains (`Missing RELAYER_PRIVATE_KEY...`).

### C) Lint failures (not isolated/safe to patch in QA lane)
`npm run lint` currently fails at scale; representative first failures:
- `BlockWalletDigi/client/src/components/nav.tsx:2:24` — unused import `Settings`
- `BlockWalletDigi/client/src/components/qr-scanner.tsx:31:9` — use-before-declare (`startCamera`)
- `BlockWalletDigi/client/src/components/qr-scanner.tsx:33:13` — use-before-declare (`stopCamera`)
- `BlockWalletDigi/client/src/components/share-modal.tsx:52:7` — `setState` directly in effect

Plus many `no-explicit-any`, `no-unused-vars`, react refresh/purity violations across wallet client/server.

This is broad refactor territory and **not safe for isolated QA hotpatching**.

---

## Code changes made by QA/Audit lane

1. `scripts/foundation-e2e-gate.mjs`
   - Added reusable service token resolver
   - Added wallet token bootstrap/login
   - Added wallet Authorization header for credential ingestion
   - Updated OID4VP response payload to state-bound `credential` format

2. `CredVerseRecruiter/tests/sepolia-smoke.test.ts`
   - Guarded `afterAll` close call when server was never initialized

---

## Release readiness conclusion

Despite strong core test pass rates, production release remains **NO-GO** until all blockers are resolved:

1. Lint gate cleaned to green (`npm run lint`)
2. Launch strict gate required prod secrets configured (`REDIS_URL`, `SENTRY_DSN`/`GATEWAY_SENTRY_DSN`, `JWT_SECRET`, `JWT_REFRESH_SECRET`)
3. Sepolia smoke prerequisites provisioned and test rerun green with relayer key

---

## Notes for release board

- Foundation local gate is now green after QA lane patch.
- Contract/static and monorepo tests are green locally.
- Current verdict is intentionally conservative and evidence-based: **NO-GO**.
