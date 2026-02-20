# Credity12 — PRD v2.0 Implementation Gap Matrix (Strict)

**Repo:** `/Users/raghav/Desktop/credity12`  
**PRD Source:** `information__critical /PRD.md`  
**Assessment Date:** 2026-02-20  
**Method:** Direct PRD Feature Requirements mapping vs implemented routes/services/tests in `BlockWalletDigi`, `CredVerseRecruiter`, `CredVerseIssuer 3`.

---

## 1) Feature-by-feature PASS / PARTIAL / FAIL matrix

> Note: PRD has duplicate “Feature 5” headings. This matrix treats both explicitly:
> - **5A:** Reputation Rail (Cross-Platform Trust)
> - **5B:** Platform Connections

| PRD Feature | Priority | Status | Evidence in code | Strict gap verdict |
|---|---:|---|---|---|
| 1. User Onboarding & Authentication | P0 | **PARTIAL** | OTP endpoints (`/api/v1/auth/send-email-otp`, `/send-phone-otp`), Google OAuth (`/auth/google`), auth tests (`BlockWalletDigi/tests/auth-security.test.ts`) | Apple Sign-In missing; explicit PIN fallback flow missing; explicit 30-day session policy enforcement not evidenced |
| 2. Identity Verification (Complete Flow) | P0 | **PARTIAL** | Liveness/biometric/doc routes (`BlockWalletDigi/server/routes/identity.ts`), DigiLocker routes (`routes/digilocker.ts`) | No strict evidence of doc-type-specific validators (Aadhaar/PAN/Passport/DL parity), face-match accuracy harness, production-grade anti-spoof benchmark tests |
| 3. Trust Score Calculation | P0 | **PARTIAL** | Trust score API (`/api/v1/trust-score`, `/breakdown`, `/suggestions`, `/history`), service implementation (`trust-score-service`) | No explicit <1s SLA/perf test evidence; no explicit “updates within 5 min” scheduler/event test evidence |
| 4. Credential Management | P0 | **PARTIAL** | Credential CRUD + share/proof endpoints (`credentials.ts`, `sharing.ts`), tests (`credentials-authz`, `credentials-proof-schema-validation`) | Missing explicit credential expiry/status lifecycle APIs and full revocation semantics for “revoke all access for credential” across connections |
| 5A. Reputation Rail (Cross-Platform Trust) | P0 | **PARTIAL** | Reputation event/score/share-grant APIs in wallet + issuer (`routes/reputation.ts`), graph + recompute, tests (`reputation-rail`, `reputation-graph*`) | Missing explicit dispute resolution workflow APIs + SLA enforcement (48h), real-time sync contract test (<5s cross-platform propagation) |
| 5B. Platform Connections | P0 | **PARTIAL** | Connections list/pending/approve/deny/disconnect/OAuth scaffolding (`BlockWalletDigi/server/routes/connections.ts`) | Missing platform webhook callback on user approval as PRD requires; push-notification timing contract tests absent |
| 6. SafeDate Score (Dating Safety Layer) | P1 | **PARTIAL** | SafeDate evaluate route (`CredVerseRecruiter/server/routes/safedate.ts`) + reputation-derived safedate in wallet/issuer + tests (`safedate*.test.ts`) | Missing premium insights subscription flow, harassment history productized endpoint, cross-platform ban propagation API, video-call verification endpoint |
| 7. Gig Economy Onboarding Acceleration | P1 | **FAIL** | Some reusable components exist (connections + reputation) | Missing dedicated universal gig profile model/API and fast-track onboarding decision endpoint (<5 min auto-approve contract) + tests |
| 8. WorkScore (Employment Verification) | P0 | **PARTIAL** | WorkScore evaluate/read APIs (`CredVerseRecruiter/server/routes/workscore.ts`), tests (`workscore*.test.ts`, `workscore-trust-domain.test.ts`) | Missing full employer plan/ATS integration APIs, platform partner APIs/badges analytics contracts, and end-to-end 5-minute verification SLA evidence |
| 9. TenantScore (Rental) | P1 | **FAIL** | No dedicated endpoint/service found | Entire feature vertical missing (score calc, checks, APIs, tests) |
| 10. HealthScore (Healthcare) | P2 | **FAIL** | No dedicated endpoint/service found | Entire feature vertical missing |
| 11. TutorScore (Education) | P2 | **FAIL** | No dedicated endpoint/service found | Entire feature vertical missing |
| 12. HomeWorkerScore (Domestic Services) | P1 | **FAIL** | No dedicated endpoint/service found | Entire feature vertical missing |
| 13. TrustScore for Lending (Alternative Credit) | P1 | **FAIL** | No dedicated lending score API found | Entire feature vertical missing |

---

## 2) Exact missing endpoints/services/tests per feature

### Feature 1 — User Onboarding & Authentication (PARTIAL)
**Missing endpoints**
- `POST /api/v1/auth/apple`
- `GET /api/v1/auth/apple/callback`
- `POST /api/v1/auth/pin/setup`
- `POST /api/v1/auth/pin/verify`

**Missing services**
- `apple-oauth-service.ts`
- `pin-auth-service.ts`
- Session policy module enforcing 30-day refresh lifecycle (auditable)

**Missing tests**
- `tests/auth-apple-oauth.test.ts`
- `tests/auth-pin-fallback.test.ts`
- `tests/auth-session-30day-policy.test.ts`

### Feature 2 — Identity Verification (PARTIAL)
**Missing endpoints**
- `POST /api/v1/identity/document/validate-type` (Aadhaar/PAN/Passport/DL strict validators)
- `POST /api/v1/identity/face-match` (ID face vs liveness frame)

**Missing services**
- `document-type-validator-service.ts`
- `face-match-service.ts`
- `identity-quality-sla-service.ts` (first-pass success/error telemetry)

**Missing tests**
- `tests/identity-doc-type-validation.test.ts`
- `tests/identity-face-match-accuracy.test.ts`
- `tests/identity-liveness-accuracy-benchmark.test.ts`

### Feature 3 — Trust Score Calculation (PARTIAL)
**Missing endpoints**
- `POST /api/v1/trust-score/recompute` (event-driven/manual recompute trigger)

**Missing services**
- `trust-score-update-queue.ts` (guarantee update within 5 min)
- `trust-score-explainability-service.ts` (deterministic formula trace)

**Missing tests**
- `tests/trust-score-latency-sla.test.ts` (<1s compute)
- `tests/trust-score-update-window.test.ts` (<5 min update)

### Feature 4 — Credential Management (PARTIAL)
**Missing endpoints**
- `POST /api/v1/wallet/credentials/:id/revoke-all-shares`
- `POST /api/v1/wallet/credentials/:id/expire`

**Missing services**
- `credential-lifecycle-service.ts` (active/expired/pending transitions)
- `credential-revocation-fanout-service.ts` (revoke across all linked platforms)

**Missing tests**
- `tests/credential-revocation-fanout.test.ts`
- `tests/credential-expiry-lifecycle.test.ts`

### Feature 5A — Reputation Rail (PARTIAL)
**Missing endpoints**
- `POST /api/v1/reputation/disputes`
- `GET /api/v1/reputation/disputes/:id`
- `POST /api/v1/reputation/disputes/:id/resolve`

**Missing services**
- `reputation-dispute-service.ts` (48h SLA)
- `reputation-sync-orchestrator.ts` (cross-platform <5s propagation)

**Missing tests**
- `tests/reputation-dispute-sla.test.ts`
- `tests/reputation-sync-latency.test.ts`

### Feature 5B — Platform Connections (PARTIAL)
**Missing endpoints**
- `POST /api/v1/connections/:id/webhook-test`
- (or equivalent) platform webhook dispatch on approval callback

**Missing services**
- `connection-webhook-dispatcher.ts`
- `connection-notification-sla-service.ts`

**Missing tests**
- `tests/connections-webhook-delivery.test.ts`
- `tests/connections-notification-latency.test.ts`

### Feature 6 — SafeDate (PARTIAL)
**Missing endpoints**
- `GET /api/v1/safedate/premium/insights`
- `POST /api/v1/safedate/reports`
- `POST /api/v1/safedate/ban-propagation`
- `POST /api/v1/safedate/video-verify/init`

**Missing services**
- `safedate-premium-service.ts`
- `harassment-report-aggregation-service.ts`
- `ban-propagation-service.ts`

**Missing tests**
- `tests/safedate-premium-access.test.ts`
- `tests/safedate-ban-propagation.test.ts`
- `tests/safedate-video-verify.test.ts`

### Feature 7 — Gig Economy Onboarding (FAIL)
**Missing endpoints**
- `POST /api/v1/gig/profile/build`
- `GET /api/v1/gig/profile/:userId`
- `POST /api/v1/gig/onboarding/fast-track`

**Missing services**
- `gig-profile-service.ts`
- `gig-fasttrack-decision-service.ts`

**Missing tests**
- `tests/gig-profile-aggregation.test.ts`
- `tests/gig-fasttrack-contract.test.ts`

### Feature 8 — WorkScore (PARTIAL)
**Missing endpoints**
- `POST /api/v1/workscore/verify-candidate` (5-min verification contract endpoint)
- `POST /api/v1/workscore/ats/webhook`
- `GET /api/v1/workscore/platform/analytics`

**Missing services**
- `workscore-ats-integration-service.ts`
- `workscore-platform-badge-service.ts`
- `workscore-sla-monitor.ts`

**Missing tests**
- `tests/workscore-ats-integration.test.ts`
- `tests/workscore-5min-sla.test.ts`
- `tests/workscore-platform-analytics-contract.test.ts`

### Features 9/10/11/12/13 — TenantScore / HealthScore / TutorScore / HomeWorkerScore / Lending TrustScore (FAIL)
**Missing endpoints**
- Tenant: `/api/v1/tenantscore/*`
- Health: `/api/v1/healthscore/*`
- Tutor: `/api/v1/tutorscore/*`
- HomeWorker: `/api/v1/homeworkerscore/*`
- Lending: `/api/v1/lending/trustscore/*`

**Missing services**
- Vertical-specific scoring + validation + evidence services for each domain

**Missing tests**
- Full route, domain, persistence, and policy tests for each vertical

---

## 3) Prioritized implementation backlog (P0 first)

## P0 (Blockers to PRD v2.0 core compliance)
1. **F1 auth completion:** add Apple Sign-In + PIN fallback + 30-day session policy tests.
2. **F2 identity hardening:** add strict doc-type validation and face-match endpoint + accuracy tests.
3. **F3 trust-score SLA:** implement recompute/update pipeline with <5 min guarantee; add latency tests.
4. **F5A reputation dispute + sync SLA:** introduce disputes API + 48h resolution workflow and sync-latency tests.
5. **F8 WorkScore enterprise readiness:** ATS webhook integration + 5-min verification SLA evidence.
6. **F7 gig onboarding API:** implement universal gig profile and fast-track endpoint (PRD P1 but foundational for rail utility).

## P1
7. **F5B platform connection webhook delivery:** add webhook dispatch contract after approval + notification SLA tests.
8. **F6 SafeDate premium + safety ops:** premium insights, report/ban propagation, video verify.
9. **F9 TenantScore vertical bootstrap** (MVP APIs + domain model + tests).
10. **F12 HomeWorkerScore vertical bootstrap** (MVP APIs + tests).
11. **F13 Lending TrustScore vertical bootstrap** (MVP APIs + tests).

## P2
12. **F10 HealthScore vertical bootstrap**.
13. **F11 TutorScore vertical bootstrap**.

---

## 4) Acceptance criteria + evidence commands per backlog item

### P0-1 F1 auth completion
**Acceptance criteria**
- Apple OAuth login succeeds and creates/links user.
- PIN setup/verify works as fallback when biometric unavailable.
- Refresh/session policy enforces 30-day max lifecycle.

**Evidence commands**
```bash
cd /Users/raghav/Desktop/credity12/BlockWalletDigi
npm test -- tests/auth-apple-oauth.test.ts tests/auth-pin-fallback.test.ts tests/auth-session-30day-policy.test.ts
rg -n "auth/apple|auth/pin" server/routes
```

### P0-2 F2 identity hardening
**Acceptance criteria**
- Aadhaar/PAN/Passport/DL validators reject malformed docs.
- Face-match endpoint returns confidence and threshold decision.
- Liveness/doc benchmark tests meet PRD thresholds.

**Evidence commands**
```bash
cd /Users/raghav/Desktop/credity12/BlockWalletDigi
npm test -- tests/identity-doc-type-validation.test.ts tests/identity-face-match-accuracy.test.ts tests/identity-liveness-accuracy-benchmark.test.ts
rg -n "document/validate-type|face-match" server/routes/identity.ts
```

### P0-3 F3 trust-score SLA
**Acceptance criteria**
- Score compute endpoint P95 <1s in test harness.
- New events reflected in score within 5 minutes.

**Evidence commands**
```bash
cd /Users/raghav/Desktop/credity12/BlockWalletDigi
npm test -- tests/trust-score-latency-sla.test.ts tests/trust-score-update-window.test.ts
```

### P0-4 F5A reputation disputes + sync
**Acceptance criteria**
- Users/platforms can open dispute, view state, and resolve.
- Resolution SLA breach is measurable; 48h policy enforced.
- Cross-platform event propagation verified under 5s contract in integration tests.

**Evidence commands**
```bash
cd /Users/raghav/Desktop/credity12
npm test -- BlockWalletDigi/tests/reputation-dispute-sla.test.ts 'CredVerseIssuer 3/tests/reputation-sync-latency.test.ts'
rg -n "reputation/disputes|sync" BlockWalletDigi/server CredVerseIssuer\ 3/server
```

### P0-5 F8 WorkScore enterprise readiness
**Acceptance criteria**
- ATS webhook endpoint accepts/verifies events.
- Candidate verification workflow completes in <=5 min (contract test).

**Evidence commands**
```bash
cd /Users/raghav/Desktop/credity12/CredVerseRecruiter
npm test -- tests/workscore-ats-integration.test.ts tests/workscore-5min-sla.test.ts
rg -n "workscore/ats|verify-candidate" server/routes
```

### P0-6 F7 gig onboarding API
**Acceptance criteria**
- Universal gig profile aggregates connected platform signals.
- Fast-track endpoint returns APPROVE/REVIEW/REJECT with reasons.
- Verified candidate auto-approve path completes in <5 min in tests.

**Evidence commands**
```bash
cd /Users/raghav/Desktop/credity12
rg -n "gig/profile|gig/onboarding" BlockWalletDigi/server CredVerseRecruiter/server
npm test -- BlockWalletDigi/tests/gig-profile-aggregation.test.ts CredVerseRecruiter/tests/gig-fasttrack-contract.test.ts
```

### P1/P2 vertical bootstraps (F9-F13)
**Acceptance criteria**
- Each vertical has: score calc service, ingestion endpoints, retrieval endpoints, policy tests.
- OpenAPI specs include each vertical namespace.

**Evidence commands**
```bash
cd /Users/raghav/Desktop/credity12
rg -n "tenantscore|healthscore|tutorscore|homeworkerscore|lending/trustscore" .
npm test -- tests/*tenantscore*.test.ts tests/*healthscore*.test.ts tests/*tutorscore*.test.ts tests/*homeworker*.test.ts tests/*lending*.test.ts
```

---

## Quick factual evidence pointers used in this assessment
- Wallet canonical route mounts: `BlockWalletDigi/server/routes.ts`
- Wallet auth/identity/trust/connections routes:
  - `BlockWalletDigi/server/routes/auth.ts`
  - `BlockWalletDigi/server/routes/identity.ts`
  - `BlockWalletDigi/server/routes/trust-score.ts`
  - `BlockWalletDigi/server/routes/connections.ts`
  - `BlockWalletDigi/server/routes/reputation.ts`
- Recruiter SafeDate/WorkScore routes:
  - `CredVerseRecruiter/server/routes/safedate.ts`
  - `CredVerseRecruiter/server/routes/workscore.ts`
- Issuer reputation rail routes:
  - `CredVerseIssuer 3/server/routes/reputation.ts`
- Test inventory:
  - `BlockWalletDigi/tests/*.test.ts`
  - `CredVerseRecruiter/tests/*.test.ts`
  - `CredVerseIssuer 3/tests/*.test.ts`

---

## Overall strict compliance snapshot
- **PASS:** 0
- **PARTIAL:** 8 (Features 1,2,3,4,5A,5B,6,8)
- **FAIL:** 6 (Features 7,9,10,11,12,13)

**Conclusion:** Core trust rail foundations exist, but PRD v2.0 strict implementation is incomplete due to missing auth completeness (Apple/PIN/session policy evidence), identity validation depth, dispute/SLA machinery, gig onboarding API, and five vertical score products (Tenant/Health/Tutor/HomeWorker/Lending).
