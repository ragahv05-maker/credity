# Credity Launch Compliance Evidence Pack (Audit Template)

> Use this template for each release candidate. Keep all values immutable once signed.

## 0) Release metadata

- Release version / tag:
- Commit SHA (monorepo root):
- Environment: `staging` / `pre-prod` / `production`
- Date/time (IST):
- Prepared by:
- Approvers:
  - Security Lead:
  - Release Manager:
  - Compliance Lead:

## 1) Gate execution summary (required)

| Gate                    | Command                                                                | Exit code | Status          | Executed at (IST) | Evidence          |
| ----------------------- | ---------------------------------------------------------------------- | --------: | --------------- | ----------------- | ----------------- |
| Type/build checks       | `npm run check`                                                        |           | ☐ PASS / ☐ FAIL |                   | attach full log   |
| Monorepo tests          | `npm test`                                                             |           | ☐ PASS / ☐ FAIL |                   | attach full log   |
| Launch gate (strict)    | `set -a; source .env.launch.local; set +a; npm run gate:launch:strict` |           | ☐ PASS / ☐ FAIL |                   | attach full log   |
| Foundation e2e gate     | `npm run gate:foundation` (or `npm run gate:foundation:local`)         |           | ☐ PASS / ☐ FAIL |                   | attach full log   |
| Contracts security gate | `npm run gate:contracts:security`                                      |           | ☐ PASS / ☐ FAIL |                   | attach CI URL/log |

### 1.1 Gate output excerpts (paste exact terminal output)

#### `npm run check`

```text
[paste exact output]
```

#### `npm test`

```text
[paste exact output]
```

#### `npm run gate:launch:strict`

```text
[paste exact output]
```

#### `npm run gate:foundation` / `npm run gate:foundation:local`

```text
[paste exact output]
```

#### `npm run gate:contracts:security`

```text
[paste exact output]
```

## 2) Production launch checklist evidence mapping

### 2.1 Secrets & key management

- Secret scan report path/URL:
- Runtime secret manager screenshot/link:
- Secret rotation drill ticket/date:
- Statement confirming no `.env` in prod deploy path:

### 2.2 Distributed rate limiting

- `REDIS_URL` config evidence:
- Multi-instance 429 consistency test evidence:
- Dashboard screenshot path:

### 2.3 Observability & alerting

- Sentry/monitoring DSN evidence:
- Log redaction config evidence:
- Alert policy IDs (availability/p95/5xx):
- `/api/health` checks (all services):

### 2.4 Incident runbooks

- Incident triage runbook link:
- Rollback runbook link:
- On-call + escalation evidence:
- CERT-In/compliance tabletop date + attendees:

### 2.5 Rollback readiness

- Last-known-good version:
- Rollback command(s):
- DB rollback/forward-fix plan:
- Rehearsal log link:

### 2.6 Compliance API regression

- Consent tests report:
- Data export/delete report:
- Audit-log retention + deadline field validation:

### 2.7 Contract security

- CI run URL:
- Latest review artifact:
- Network/env pinning evidence:

## 3) Known risks and residual gaps (must not be empty)

| ID   | Risk description | Severity | Likelihood | Mitigation/owner | Launch impact |
| ---- | ---------------- | -------- | ---------- | ---------------- | ------------- |
| R-01 |                  |          |            |                  |               |
| R-02 |                  |          |            |                  |               |
| R-03 |                  |          |            |                  |               |

## 4) Go/No-Go decision

- Decision: ☐ GO / ☐ NO-GO
- Decision timestamp (IST):
- Decision owners:
- Blocking conditions (if NO-GO):

## 5) Final sign-off

- Security Lead (name/sign/date):
- Release Manager (name/sign/date):
- Compliance Lead (name/sign/date):

---

## Appendix A — Current baseline snapshot (2026-02-14, local execution)

> This section is intentionally retained to seed the first audit packet and should be copied into the release-specific evidence file.

### A.1 Command outcomes observed

- `npm run check` → **FAIL**
  - `CredVerseIssuer 3/server/services/queue-service.ts(204,64): error TS2339: Property 'attemptsMade' does not exist on type '{ jobId: string; failedReason: string; prev?: string | undefined; }'.`
- `npm run test` → **INCOMPLETE / NOT FINALIZED**
  - Wallet + Issuer suites passed in the observed run; full monorepo command was interrupted before completion during Recruiter stage (no final exit code recorded).
- `set -a; source .env.launch.local; set +a; npm run gate:launch:strict` → **PASS**
- `npm run gate:foundation` → **FAIL** (`fetch failed`, services not up)
- `npm run gate:foundation:local` → **FAIL** (`POST /api/wallet/credentials` returned `401 No token provided`)
- `npm run gate:contracts:security` → **PASS** (Solhint + Hardhat compile + 28 contract tests)

### A.2 Residual risk snapshot

- `R-BASE-01` Type-checking gate broken in issuer queue service (`attemptsMade` typing mismatch).
- `R-BASE-02` Foundation E2E launch criterion currently failing (`wallet/credentials` auth failure in local orchestrated gate).
- `R-BASE-03` Test environment relies on development fallbacks in multiple services (JWT/VC key encryption/DigiLocker/Redis warnings), requiring production-env proof for audit closure.
