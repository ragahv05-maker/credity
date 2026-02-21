# Credity Swarm S20 — Launch Evidence Pack Template Refresh + Current Gate Snapshot

## Scope completed

Updated launch compliance evidence documentation to be audit-ready and captured a current baseline of checks/tests/gates with explicit residual risks.

## Files changed

- `docs/compliance/launch-evidence-template.md`

## What was improved (audit readiness)

The template was upgraded from a short checklist into a structured, sign-off ready evidence pack with:

1. **Release metadata block**
   - version/tag, commit SHA, environment, prepared-by, approvers.

2. **Mandatory gate execution matrix**
   - Commands, exit codes, pass/fail states, timestamps, and evidence links for:
     - `npm run check`
     - `npm test`
     - `npm run gate:launch:strict`
     - `npm run gate:foundation` / `npm run gate:foundation:local`
     - `npm run gate:contracts:security`

3. **Exact output capture sections**
   - Dedicated code-block slots to paste full terminal output per gate for audit traceability.

4. **Evidence mapping aligned to production launch gate categories**
   - Secrets/key management
   - Distributed rate limiting
   - Observability/alerting
   - Incident runbooks
   - Rollback readiness
   - Compliance regression
   - Contract security

5. **Required risk register**
   - Severity, likelihood, mitigation owner, and launch impact columns.

6. **Formal Go/No-Go + sign-off sections**
   - Decision timestamp, owners, blockers, and final signatures.

7. **Seeded baseline appendix (2026-02-14)**
   - Embedded current local command outcomes + residual risk snapshot to bootstrap first evidence packet.

---

## Current checks/tests/gate outputs captured

### 1) `npm run check`

- **Status:** ❌ FAIL
- **Failure:**
  - `CredVerseIssuer 3/server/services/queue-service.ts(204,64): error TS2339: Property 'attemptsMade' does not exist on type '{ jobId: string; failedReason: string; prev?: string | undefined; }'.`

### 2) `npm test`

- **Status:** ⚠️ Incomplete / no final monorepo exit code recorded
- Wallet suite observed passing (12 files / 28 tests).
- Issuer suite observed passing (17 files / 49 tests).
- Full command was interrupted during recruiter stage; therefore not counted as a pass for launch evidence.

### 3) `set -a; source .env.launch.local; set +a; npm run gate:launch:strict`

- **Status:** ✅ PASS
- Reported passes include:
  - runbooks present
  - production gate doc present
  - compliance evidence template present
  - `REDIS_URL` present
  - Sentry DSN present
  - JWT secrets present

### 4) `npm run gate:foundation`

- **Status:** ❌ FAIL
- **Failure:** `fetch failed`
- Gate hint indicated services should be started or use local orchestrated gate.

### 5) `npm run gate:foundation:local`

- **Status:** ❌ FAIL
- Services started and health checks reached green.
- Flow failed at wallet credential storage:
  - `POST /api/wallet/credentials failed (401): {"error":"No token provided"}`

### 6) `npm run gate:contracts:security`

- **Status:** ✅ PASS
- Solhint + Hardhat compile + Hardhat tests completed.
- Contract suite summary: **28 passing**.

---

## Remaining known risks (launch-relevant)

1. **Type-check gate blocker (high)**
   - Issuer queue service typing error breaks `npm run check` gate.

2. **Foundation E2E gate failure (high)**
   - Orchestrated local foundation gate currently fails on wallet auth/token propagation.

3. **Evidence completeness gap for test gate (medium-high)**
   - Full monorepo `npm test` not finalized in this run; requires clean pass artifact.

4. **Environment-hardening proof gap (medium)**
   - Development fallback warnings seen in runtime/test logs (JWT/ISSUER_KEY_ENCRYPTION/Redis/DigiLocker) require production-config evidence in release packet.

## Notes for main agent

- S20 requested report is complete and saved at: `swarm/reports/credity-s20-launch-evidence.md`.
- Template is now audit-oriented and includes a baseline appendix with today’s observed gate status, so release owners can immediately fork it into a release-specific evidence file.
