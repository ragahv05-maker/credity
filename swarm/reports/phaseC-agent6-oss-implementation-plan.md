# Phase C — Agent 6 OSS-to-Implementation Plan

**Date:** 2026-02-21 (IST)  
**Repo:** `/Users/raghav/Desktop/credity`  
**Inputs used:**
- `swarm/reports/prod-phase-lane5-oss-benchmark.md`
- `swarm/reports/prd-gap-matrix-credity12.md`
- Current code scan of Wallet / Recruiter / Issuer routes, services, and tests

---

## 1) Unresolved PRD modules in scope (OSS-backed)

From the strict gap matrix + current route inventory, the highest-value unresolved modules that map to adopted OSS are:

1. **F5A Reputation dispute SLA flow** (dispute endpoints + 48h enforcement + cross-service propagation)
2. **F8 WorkScore ATS integration + 5-min verification SLA evidence**
3. **F7 Gig onboarding fast-track (<5 min) with explainable decisions**
4. **F5B connection approval webhook dispatch SLA** (adjacent dependency to F5A/F8 data freshness)

---

## 2) OSS component → concrete Credity service/endpoint mapping

## A) Temporal (ADOPT runtime)
**Role:** durable orchestration, timers, retries, idempotent long-running workflows

**Credity target modules:**
- F5A dispute SLA timers and escalation
- F8 verification deadline orchestration (<=5 min)
- F7 onboarding fast-track orchestration (<=5 min)

**Concrete implementation targets**
- New package: `packages/workflows-temporal/`
  - `src/client.ts` (Temporal connection/bootstrap)
  - `src/workers/dispute-worker.ts`
  - `src/workers/workscore-worker.ts`
  - `src/workers/gig-onboarding-worker.ts`
  - `src/workflows/dispute-resolution.workflow.ts`
  - `src/workflows/workscore-verify.workflow.ts`
  - `src/workflows/gig-fasttrack.workflow.ts`
  - `src/activities/{reputation,workscore,gig}.activities.ts`
- Runtime hooks:
  - `BlockWalletDigi/server/index.ts` (register dispute workflow trigger)
  - `CredVerseRecruiter/server/index.ts` (register verify-candidate + ATS ingestion triggers)
  - optional `scripts/` worker launch script (for local/staging split)

**API surfaces to wire**
- `POST /api/v1/reputation/disputes`
- `GET /api/v1/reputation/disputes/:id`
- `POST /api/v1/reputation/disputes/:id/resolve`
- `POST /api/workscore/verify-candidate` (Recruiter is currently `/api` prefixed)
- `POST /api/v1/gig/onboarding/fast-track`

---

## B) json-rules-engine (ADOPT runtime)
**Role:** deterministic policy decisions with explainable reason paths

**Credity target modules:**
- F7 fast-track decisioning (`APPROVE|REVIEW|REJECT`)
- F5A dispute triage/severity routing
- F8 verification fallback policy (manual review vs pass)

**Concrete implementation targets**
- New package: `packages/policy-rules/`
  - `src/engine.ts`
  - `src/rules/gig-fasttrack.v1.json`
  - `src/rules/reputation-dispute-triage.v1.json`
  - `src/rules/workscore-verify.v1.json`
  - `src/reason-codes.ts` (align with `@credverse/shared-auth`)
- Service integration points:
  - `BlockWalletDigi/server/services/reputation-dispute-service.ts`
  - `BlockWalletDigi/server/services/gig-fasttrack-decision-service.ts`
  - `CredVerseRecruiter/server/services/workscore-verify-policy-service.ts`

---

## C) tap-greenhouse patterns (ADOPT pattern, first-party implementation)
**Role:** ATS schema/auth/pagination baseline; no direct embedded Singer runtime required

**Credity target modules:**
- F8 ATS ingestion and normalization

**Concrete implementation targets**
- `CredVerseRecruiter/server/integrations/ats/providers/greenhouse.ts`
- `CredVerseRecruiter/server/integrations/ats/providers/lever.ts`
- `CredVerseRecruiter/server/integrations/ats/normalizers/{candidate,application,employment}.ts`
- `CredVerseRecruiter/server/services/workscore-ats-integration-service.ts`
- `CredVerseRecruiter/server/routes/workscore.ts` (add webhook + analytics + verify-candidate endpoint)

---

## 3) Executable starter task list (repo/file/test level)

## Wave 1 — Foundation (shared infra, no API break)

1. **Add Temporal + policy packages**
   - Files:
     - `packages/workflows-temporal/package.json`
     - `packages/workflows-temporal/src/**`
     - `packages/policy-rules/package.json`
     - `packages/policy-rules/src/**`
   - Tests:
     - `packages/workflows-temporal/tests/dispute-workflow.test.ts`
     - `packages/workflows-temporal/tests/workscore-deadline.test.ts`
     - `packages/policy-rules/tests/gig-fasttrack-rules.test.ts`
     - `packages/policy-rules/tests/dispute-triage-rules.test.ts`

2. **Expose shared contracts for new modules**
   - Files:
     - `packages/shared-auth/src/contracts.ts`
     - `packages/shared-auth/src/recruiter-evaluation-contracts.ts`
     - `packages/shared-auth/src/reputation-contracts.ts`
   - Tests:
     - `packages/shared-auth/tests/new-contracts.test.ts`

## Wave 2 — F5A reputation dispute flow

3. **Add dispute APIs to wallet reputation routes**
   - Files:
     - `BlockWalletDigi/server/routes/reputation.ts`
     - `BlockWalletDigi/server/storage.ts` (dispute persistence)
     - `BlockWalletDigi/server/services/reputation-dispute-service.ts` (new)
   - Endpoints:
     - `POST /api/v1/reputation/disputes`
     - `GET /api/v1/reputation/disputes/:id`
     - `POST /api/v1/reputation/disputes/:id/resolve`
   - Tests:
     - `BlockWalletDigi/tests/reputation-dispute-sla.test.ts`
     - `BlockWalletDigi/tests/reputation-dispute-routes.test.ts`

4. **Add sync orchestration hooks to issuer graph path**
   - Files:
     - `CredVerseIssuer 3/server/services/reputation-graph.ts`
     - `CredVerseIssuer 3/server/services/reputation-graph-event-mapper.ts`
     - `CredVerseIssuer 3/server/routes/reputation.ts`
   - Tests:
     - `CredVerseIssuer 3/tests/reputation-sync-latency.test.ts`
     - extend `CredVerseIssuer 3/tests/reputation-route-graph.test.ts`

## Wave 3 — F8 WorkScore ATS + verify SLA

5. **Implement ATS adapter boundary**
   - Files:
     - `CredVerseRecruiter/server/integrations/ats/providers/greenhouse.ts`
     - `CredVerseRecruiter/server/integrations/ats/providers/lever.ts`
     - `CredVerseRecruiter/server/services/workscore-ats-integration-service.ts`
   - Tests:
     - `CredVerseRecruiter/tests/workscore-ats-integration.test.ts`
     - fixtures: `CredVerseRecruiter/tests/fixtures/ats/*.json`

6. **Expand WorkScore routes for SLA and analytics contracts**
   - Files:
     - `CredVerseRecruiter/server/routes/workscore.ts`
     - `CredVerseRecruiter/server/services/workscore.ts`
     - `CredVerseRecruiter/server/storage.ts`
   - Endpoints:
     - `POST /api/workscore/verify-candidate`
     - `POST /api/workscore/ats/webhook`
     - `GET /api/workscore/platform/analytics`
   - Tests:
     - `CredVerseRecruiter/tests/workscore-5min-sla.test.ts`
     - `CredVerseRecruiter/tests/workscore-platform-analytics-contract.test.ts`

## Wave 4 — F7 Gig onboarding fast-track

7. **Add gig profile + fast-track APIs (wallet canonical)**
   - Files:
     - `BlockWalletDigi/server/routes/gig.ts` (new)
     - `BlockWalletDigi/server/routes.ts` (mount `/api/v1/gig`)
     - `BlockWalletDigi/server/services/gig-profile-service.ts`
     - `BlockWalletDigi/server/services/gig-fasttrack-decision-service.ts`
   - Endpoints:
     - `POST /api/v1/gig/profile/build`
     - `GET /api/v1/gig/profile/:userId`
     - `POST /api/v1/gig/onboarding/fast-track`
   - Tests:
     - `BlockWalletDigi/tests/gig-profile-aggregation.test.ts`
     - `BlockWalletDigi/tests/gig-fasttrack-contract.test.ts`

## Wave 5 — F5B connection approval webhook (dependency closeout)

8. **Webhook dispatch on approval + notification latency evidence**
   - Files:
     - `BlockWalletDigi/server/routes/connections.ts`
     - `BlockWalletDigi/server/services/connection-webhook-dispatcher.ts` (new)
     - `packages/shared-auth/src/webhooks.ts` (reuse signing/verification primitives)
   - Endpoints:
     - `POST /api/v1/connections/:id/webhook-test`
   - Tests:
     - `BlockWalletDigi/tests/connections-webhook-delivery.test.ts`
     - `BlockWalletDigi/tests/connections-notification-latency.test.ts`

---

## 4) Migration-safe rollout order

1. **Ship shared packages first** (`policy-rules`, `workflows-temporal`) behind feature flags:
   - `FEATURE_TEMPORAL_WORKFLOWS=false`
   - `FEATURE_GIG_FASTTRACK=false`
   - `FEATURE_WORKSCORE_ATS=false`
   - `FEATURE_REPUTATION_DISPUTES=false`

2. **Dark-launch workers in staging** with read-only mode:
   - Workflows execute but do not mutate final decision state until toggled.

3. **Enable write-path per module** in this order:
   - F5A disputes (lowest external dependency)
   - F8 ATS webhook ingestion (provider-specific risk)
   - F7 fast-track decisions (depends on both trust and ATS signal quality)
   - F5B webhooks (external callback blast radius)

4. **Canary by tenant/platform**:
   - allowlist partner IDs for Greenhouse first, then Lever.
   - keep legacy paths active until contract tests pass for 7 consecutive days.

5. **Cutover gates** (must all pass):
   - `npm run check`
   - targeted new test suites per wave
   - `npm run gate:launch:strict`
   - latency SLO dashboards green (5 min and 48h windows as applicable)

---

## 5) Risk controls and operational guardrails

1. **Idempotency + replay safety**
   - Require idempotency keys on dispute create and ATS webhook ingest.
   - Persist workflow run IDs and dedupe hashes.

2. **Timeout/compensation policy**
   - Temporal activities with bounded retries + dead-letter queue.
   - Fallback decision state: `REVIEW` (never auto-approve on uncertain upstream).

3. **Schema/version drift protection**
   - Version all rulesets (`*.v1.json`) and ATS payload normalizers.
   - Add contract snapshot tests for provider payloads.

4. **PII and secret handling**
   - Never log raw ATS payload or OAuth tokens.
   - Reuse existing encryption patterns from `connections.ts` for provider tokens.

5. **SLA observability requirements**
   - Metrics:
     - `reputation_dispute_ttr_seconds`
     - `workscore_verify_latency_ms`
     - `gig_fasttrack_latency_ms`
     - `ats_webhook_process_latency_ms`
   - Alerts: P95 breaches (48h dispute, 5-min verify/fast-track).

6. **License/legal controls**
   - Runtime deps limited to MIT/Apache/ISC (Temporal SDK, json-rules-engine).
   - tap-greenhouse and Singer taps used as reference patterns only.

---

## 6) Automation workflow updates (to make execution stick)

Add CI jobs in `.github/workflows/quality-gates-ci.yml` for:
- `packages/policy-rules` tests
- `packages/workflows-temporal` tests (with Temporal test server/mocks)
- targeted module SLA contract suites:
  - `BlockWalletDigi/tests/reputation-dispute-sla.test.ts`
  - `CredVerseRecruiter/tests/workscore-5min-sla.test.ts`
  - `BlockWalletDigi/tests/gig-fasttrack-contract.test.ts`

Add artifact upload of SLA timing summaries for regression diffing.

---

## 7) Definition of done for this OSS implementation lane

This lane is complete when:
1. F5A, F7, F8, and F5B endpoints exist and are wired under canonical API prefixes.
2. Temporal-backed orchestration is running in staging with canary tenants.
3. json-rules-engine decisions produce auditable reason codes.
4. All new tests listed above pass in CI and launch gate remains green.
5. No breaking changes to existing route contracts without migration notes.
