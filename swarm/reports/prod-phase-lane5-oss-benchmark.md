# Credity — Lane 5 OSS Benchmark (PRD unresolved modules)

**Date:** 2026-02-21 (IST)  
**Repo scanned:** `/Users/raghav/Desktop/credity`  
**Target modules:** Reputation dispute flow (F5A), WorkScore ATS integration (F8), Gig onboarding (F7)

## 1) Method (skills explicitly applied)

- **oss-hunter:** shortlisted OSS projects with production relevance (workflow/case mgmt, ATS connectors, decision engines).
- **github:** validated project scope from GitHub README + LICENSE (raw files where possible).
- **architecture:** mapped each candidate to Credity’s missing APIs/services from `swarm/reports/prd-gap-matrix-credity12.md` and produced adopt/reject + integration path.

> Note: `web_search` was unavailable (missing Brave API key), so discovery/validation used direct GitHub fetch.

---

## 2) Shortlist with adopt/reject decision

## A. Reputation dispute flow (PRD F5A)

| Candidate | Why it is relevant | License signal | Decision |
|---|---|---|---|
| **temporalio/temporal** | Durable workflow orchestration, retries, timers, human-in-loop stages; ideal for 48h dispute SLA orchestration and escalations. | MIT | **ADOPT** |
| **zammad/zammad** | Mature ticket/case lifecycle concepts (status, ownership, audit trail, SLA mindset) for dispute ops UX patterns. | AGPL-3.0 | **ADOPT (pattern-only, not embedded runtime)** |
| **camunda/camunda** | BPMN/DMN orchestration for complex dispute processes. | license model unclear from quick scan; Camunda 7 CE EoL noted | **REJECT for now** (licensing/runtime complexity risk) |
| **osTicket/osTicket** | Simple ticketing lifecycle reference. | (not fully validated in this pass) | **REJECT** (legacy PHP stack mismatch with TS services) |

**Recommended build for F5A:**
- Core engine: **Temporal**
- Product/API layer in Credity services:
  - `POST /api/v1/reputation/disputes`
  - `GET /api/v1/reputation/disputes/:id`
  - `POST /api/v1/reputation/disputes/:id/resolve`
- SLA worker (Temporal timers): 24h warning, 48h breach event, auto-escalation queue.
- Audit/event model: `dispute_created`, `evidence_added`, `review_started`, `resolved`, `sla_breached`.
- Test targets: `reputation-dispute-sla.test.ts`, `reputation-sync-latency.test.ts`.

---

## B. WorkScore ATS integration (PRD F8)

| Candidate | Why it is relevant | License signal | Decision |
|---|---|---|---|
| **MeltanoLabs/tap-greenhouse** | Working Greenhouse Harvest OAuth2 extraction logic; good reference for schema + auth handling. | Apache-2.0 | **ADOPT** |
| **singer-io/tap-lever** | Lever resource coverage (candidates/applications/offers/opportunities); useful baseline for ingestion contracts. | AGPL-3.0 | **ADOPT (reference only / avoid code-copy into closed modules)** |
| **NangoHQ/nango** | OAuth + API integration infrastructure for many SaaS APIs; can accelerate ATS connector maintenance. | Elastic License 2.0 | **REJECT for core dependency** (license constraints) |
| **airbytehq/airbyte** | Broad connector ecosystem, includes ATS-adjacent connectors; good for batch analytics pipeline. | Elastic License 2.0 | **REJECT for embedded product path** (heavy + license) |
| **opencats/OpenCATS** | Open ATS domain model and pipeline semantics. | MPL 2.0 + legacy CATS public license | **ADOPT (domain model reference only)** |

**Recommended build for F8:**
- Build first-party thin adapter layer (`workscore-ats-integration-service.ts`) using **Meltano/Singer schema ideas**, not full platform embedding.
- Canonical ingestion endpoint: `POST /api/v1/workscore/ats/webhook`.
- Provider adapters:
  - `providers/greenhouse.ts` (OAuth2 + Harvest entities)
  - `providers/lever.ts` (webhook/poll hybrid)
- Normalize into internal model: `candidate_profile`, `job_stage_events`, `employment_verification_evidence`.
- SLA enforcement worker: ensure `verify-candidate` completes <= 5 min with deadline + fallback states.
- Contract tests: `workscore-ats-integration.test.ts`, `workscore-5min-sla.test.ts`, `workscore-platform-analytics-contract.test.ts`.

---

## C. Gig onboarding acceleration (PRD F7)

| Candidate | Why it is relevant | License signal | Decision |
|---|---|---|---|
| **CacheControl/json-rules-engine** | Lightweight JSON policy engine for APPROVE/REVIEW/REJECT fast-track decisions with explainable reasons. | ISC | **ADOPT** |
| **temporalio/temporal** | Best fit for <5 min multi-step onboarding orchestration + retries/timeouts + idempotency. | MIT | **ADOPT** |
| **ballerine-io/ballerine** | Strong KYC/KYB + case mgmt concept match for onboarding journeys. | mixed/multi-license; OSS repo notes major rebuild & not actively supported | **REJECT (stability risk now)** |
| **kestra-io/kestra** | Event-driven orchestration with plugin ecosystem. | (not fully validated in this pass) | **REJECT for core path** (extra platform overhead vs Temporal already chosen) |

**Recommended build for F7:**
- Use shared orchestration substrate (**Temporal**) + decision layer (**json-rules-engine**).
- Add APIs:
  - `POST /api/v1/gig/profile/build`
  - `GET /api/v1/gig/profile/:userId`
  - `POST /api/v1/gig/onboarding/fast-track`
- Decision policy inputs: trust score, credential freshness, dispute flags, platform history density, WorkScore confidence.
- Output contract: `{ decision: APPROVE|REVIEW|REJECT, reasons[], expiresAt }`.
- Test targets: `gig-profile-aggregation.test.ts`, `gig-fasttrack-contract.test.ts` with <=5 min path checks.

---

## 3) Cross-module integration blueprint (single architecture)

1. **Event backbone**
   - Publish domain events from Wallet/Recruiter/Issuer services.
   - Temporal workflows subscribe/trigger orchestration jobs per module.

2. **Decision layer**
   - Central rules package (`packages/policy-rules`) using `json-rules-engine`.
   - Versioned rule sets per module (`reputation_dispute_v1`, `gig_fasttrack_v1`, `workscore_ats_v1`).

3. **Connector boundary**
   - ATS connectors isolated under `CredVerseRecruiter/server/integrations/ats/*`.
   - Keep external provider payloads out of core domain; normalize at boundary.

4. **SLA observability**
   - Emit metrics: `dispute_ttr_seconds`, `ats_verify_latency_ms`, `gig_decision_latency_ms`.
   - Alert on PRD thresholds (48h / 5min / 5min).

5. **Compliance-safe adoption policy**
   - Prefer MIT/Apache/ISC for runtime deps.
   - AGPL projects only as **process/design references** unless legal approves direct linkage/copy.
   - ELv2 projects not used in embedded production path unless commercial/legal exception granted.

---

## 4) Final recommendation (what to implement now)

## Phase 1 (immediate, low risk)
- Adopt **Temporal + json-rules-engine** as common substrate.
- Implement F5A dispute APIs + workflow timers + SLA tests.
- Implement F7 gig profile + fast-track APIs with explainable decisions.
- Implement F8 ATS adapter framework with Greenhouse first, Lever second.

## Phase 2 (after baseline)
- Pull reporting patterns from OpenCATS/Zammad into admin dashboards.
- Re-evaluate Ballerine/Camunda only if license/support posture improves or specific enterprise need emerges.

---

## 5) Repo references reviewed

- `https://github.com/temporalio/temporal`
- `https://github.com/zammad/zammad`
- `https://github.com/camunda/camunda`
- `https://github.com/osTicket/osTicket`
- `https://github.com/MeltanoLabs/tap-greenhouse`
- `https://github.com/singer-io/tap-lever`
- `https://github.com/NangoHQ/nango`
- `https://github.com/airbytehq/airbyte`
- `https://github.com/opencats/OpenCATS`
- `https://github.com/CacheControl/json-rules-engine`
- `https://github.com/ballerine-io/ballerine`
- `https://github.com/kestra-io/kestra`
