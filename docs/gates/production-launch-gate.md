# Production Launch Gate (Hardening)

Owner: Release Manager + Security Lead  
Applies to: Issuer, Wallet, Recruiter, Gateway, Contracts

## Gate Checklist (must-pass)

### 0) Mandatory Runtime Secret Inventory (must be set before Go/No-Go)

- Auth/session: `JWT_SECRET`, `JWT_REFRESH_SECRET`
- Queue/limits: `REDIS_URL`
- Observability: `SENTRY_DSN` or `GATEWAY_SENTRY_DSN` (prefer both)
- Issuer signing/encryption: `ISSUER_KEY_ENCRYPTION`, `RELAYER_PRIVATE_KEY`
- Chain routing: `REGISTRY_CONTRACT_ADDRESS`

Minimum evidence required:
- Secret manager screenshots/links (masked)
- `npm run gate:launch:strict` pass log
- Confirmation `.env` files are not used in production deploy path

### 1) Secrets & Key Management
- [ ] No hardcoded prod secrets in code/history (`gitleaks`/equivalent report clean).
- [ ] `JWT_SECRET`, `JWT_REFRESH_SECRET`, and service API keys are set in runtime secret manager.
- [ ] Secret rotation drill executed in staging in last 30 days.
- [ ] `.env` files are not used in production deploy path.

**Evidence:** secret inventory + scan report + rotation ticket link.

### 2) Distributed Rate Limiting
- [ ] Shared store configured (`REDIS_URL`) for all internet-facing services.
- [ ] Per-IP + per-identity limits enabled for auth, issuance, verification, and webhook endpoints.
- [ ] Rate-limit smoke test completed under 2+ app instances (consistent 429 behavior).

**Evidence:** config snapshot + test output + dashboard screenshot.

### 3) Observability & Alerting
- [ ] Error tracking DSN configured for all services.
- [ ] Request logs redact sensitive fields (token/password/secret/cookie/privateKey).
- [ ] SLO alerts configured: availability, p95 latency, 5xx rate.
- [ ] `/api/health` green for all services in target environment.

**Evidence:** alert policy IDs + redaction config + health check output.

### 4) Incident Runbooks
- [ ] Runbook for incident triage published and versioned.
- [ ] On-call roster + escalation path documented.
- [ ] CERT-In / compliance incident flow validated with tabletop in last quarter.

**Evidence:** runbook links + tabletop date + attendees.

### 5) Rollback Readiness
- [ ] Last known good version and rollback command documented.
- [ ] DB migration rollback strategy verified (or forward-fix plan approved).
- [ ] Rollback rehearsal in staging completed for this release train.

**Evidence:** rollback rehearsal log + deployment artifact IDs.

### 6) Compliance Evidence Pack
- [ ] Consent, data export/delete, and audit-log APIs pass regression tests.
- [ ] Incident log retention and report deadline fields present.
- [ ] Evidence bundle assembled (`docs/compliance/launch-evidence-template.md`).

**Evidence:** test report + signed release checklist.

### 7) Contract Security CI
- [ ] Contract static checks + tests pass in CI on default branch.
- [ ] No critical/high findings in latest contract review.
- [ ] Deployment scripts pinned to approved network/env.

**Evidence:** CI run URL + review artifact.

---

## Go / No-Go Criteria (measurable)

**Go only if all are true:**
1. `npm run gate:launch` exits `0`.
2. `npm run gate:contracts:security` exits `0`.
3. Foundation e2e gate passes (`npm run gate:foundation`).
4. 24h pre-launch window:
   - Sev-1/Sev-2 open incidents = `0`
   - Error rate < `1%`
   - p95 API latency < `800ms` for key routes
5. Signed approval from Security + Release owners.

**Automatic No-Go triggers:**
- Missing mandatory secret or distributed limiter store.
- Health check failing for any core service.
- Contract security CI failure.
- Unreviewed high/critical vulnerability.
- Rollback command/path not validated for current release.
