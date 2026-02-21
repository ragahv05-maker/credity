# Credity Full-Platform OSS Upgrade Plan (Beyond Wallet + OCR)

**Date:** 2026-02-21 (IST)  
**Repo audited:** `/Users/raghav/Desktop/credity`  
**Scope:** issuer, recruiter, gateway, auth/security, proofs/zk, analytics/observability, workflow/orchestration, compliance/audit, messaging/notifications, fraud detection, policy engine, CI/CD quality, docs/devex.

---

## 0) Current platform baseline (what exists today)

- Multi-service TS monorepo: `BlockWalletDigi`, `CredVerseIssuer 3`, `CredVerseRecruiter`, `credverse-gateway`, `packages/shared-auth`, `zk`.
- Core APIs already present in Issuer/Recruiter for compliance, proofs, analytics, reputation, queueing.
- Security hardening already partially done (S09): structured error codes + Sentry-safe telemetry.
- Storage model still largely **state-store over in-memory collections** (`*/server/storage.ts`) persisted via `PostgresStateStore` snapshots, not fully normalized DB domain models.
- Queueing exists in issuer only (`CredVerseIssuer 3/server/services/queue-service.ts`, BullMQ + Redis) and is domain-specific.

---

## 1) Issuer platform

### Current state + pain points

- Rich route surface exists (`server/routes/*.ts`) and queue-backed issuance exists.
- `server/storage.ts` is object-map centric with seeded demo data and snapshot persistence; hard to scale audits/analytics queries.
- Operationally coupled service (issuance, compliance, analytics, templates) in one process.

### OSS candidates

| Candidate                       | License                 | Maturity (stars/activity)                | Decision  |
| ------------------------------- | ----------------------- | ---------------------------------------- | --------- |
| PostgreSQL + Drizzle migrations | PostgreSQL / Apache-2.0 | very mature                              | **Adopt** |
| Temporal                        | MIT                     | 18.4k stars, active (updated 2026-02-20) | **Adopt** |
| Apache Kafka (event backbone)   | Apache-2.0              | 32k stars, active                        | **Defer** |

### Rationale

- Adopt DB-first domain modeling + workflow orchestration first; defer Kafka until event volume justifies ops complexity.

### Integration points

- `CredVerseIssuer 3/server/storage.ts`
- `CredVerseIssuer 3/server/services/issuance.ts`
- `CredVerseIssuer 3/server/services/queue-service.ts`
- `CredVerseIssuer 3/server/routes/issuance.ts`, `reputation.ts`, `compliance.ts`

### Phased rollout / risk / rollback

1. Add normalized issuance/compliance tables (dual-write from current storage adapter).
2. Move bulk issuance workflow orchestration to Temporal workers.
3. Switch read-path by feature flag per endpoint.  
   **Risks:** data drift between snapshot and relational models.  
   **Rollback:** flip read/write flags back to legacy storage and replay queued events.

---

## 2) Recruiter platform

### Current state + pain points

- Verification/fraud/workscore routes exist.
- Fraud AI adapter falls back deterministic; no robust model governance or policy explainability centralization.
- Storage is capped in-memory arrays (`server/storage.ts`), weak for long-term analytics/compliance evidence.

### OSS candidates

| Candidate       | License    | Maturity      | Decision  |
| --------------- | ---------- | ------------- | --------- |
| OpenSearch      | Apache-2.0 | 12.4k, active | **Adopt** |
| OpenFGA         | Apache-2.0 | 4.8k, active  | **Adopt** |
| Apache Superset | Apache-2.0 | 70.6k, active | **Defer** |

### Integration points

- `CredVerseRecruiter/server/storage.ts`
- `CredVerseRecruiter/server/services/fraud-detector.ts`
- `CredVerseRecruiter/server/services/verification-engine.ts`
- `CredVerseRecruiter/server/routes/analytics.ts`

### Rollout

- Index verification/fraud events into OpenSearch.
- Add relationship authorization via OpenFGA for recruiter team/org access.
- Keep existing JSON APIs unchanged; source from new stores under flags.
- Rollback: disable index writes and revert authz to existing middleware checks.

---

## 3) Gateway

### Current state + pain points

- Lightweight gateway with auth + mobile proxy routes.
- No dedicated API gateway controls (quotas, JWT introspection policies, schema governance).

### OSS candidates

| Candidate        | License    | Maturity              | Decision                                |
| ---------------- | ---------- | --------------------- | --------------------------------------- |
| Envoy Gateway    | Apache-2.0 | mature CNCF ecosystem | **Adopt**                               |
| Kong Gateway OSS | Apache-2.0 | mature                | **Defer**                               |
| KrakenD CE       | Apache-2.0 | mature                | **Reject** (extra layer not needed now) |

### Integration points

- `credverse-gateway/server/app.ts`
- `credverse-gateway/server/routes/mobile-proxy.ts`
- `infra/gcp/cloudrun/services.yaml`

### Rollout

- Put Envoy in front of gateway/recruiter/issuer for rate limits + authz ext hooks.
- Gradual traffic shifting at edge.
- Rollback via DNS/ingress route back to direct services.

---

## 4) Auth & Security

### Current state + pain points

- Shared middleware exists in `packages/shared-auth/src/security.ts`.
- Local auth/JWT scattered per service; no centralized IAM, no fine-grained authz model.

### OSS candidates

| Candidate              | License    | Maturity               | Decision                                                      |
| ---------------------- | ---------- | ---------------------- | ------------------------------------------------------------- |
| Keycloak               | Apache-2.0 | 32.9k, highly active   | **Adopt**                                                     |
| Ory Kratos/Hydra stack | Apache-2.0 | 13.4k (Kratos), active | **Defer**                                                     |
| Zitadel                | AGPL-3.0   | 13k, active            | **Reject** (license mismatch risk for proprietary deployment) |

### Integration points

- `packages/shared-auth/src/jwt.ts`, `middleware.ts`, `security.ts`
- `*/server/routes/auth.ts`
- `credverse-gateway/server/routes/auth.ts`

### Rollout

- Phase 1: Keycloak as OIDC issuer, keep existing JWT verification in compatibility mode.
- Phase 2: service-to-service auth via JWKS introspection.
- Rollback: fall back to current local JWT secret validation path.

---

## 5) Proofs / ZK

### Current state + pain points

- Proof services exist (`proof-service.ts`, `proof-verifier-service.ts`) but current mode is mostly merkle-membership + zk-hook metadata checks.
- `zk/` has circom/snarkjs artifacts, not tightly integrated with runtime proof orchestration and key management lifecycle.

### OSS candidates

| Candidate                           | License         | Maturity          | Decision             |
| ----------------------------------- | --------------- | ----------------- | -------------------- |
| snarkjs + circom2 (already present) | GPL-3.0 / mixed | mature ecosystem  | **Adopt (continue)** |
| gnark (Go)                          | Apache-2.0      | mature zk library | **Defer**            |
| Noir + Barretenberg                 | MIT/Apache mix  | rising maturity   | **Defer**            |

### Integration points

- `zk/scripts/*.mjs`, `zk/artifacts/*`
- `CredVerseIssuer 3/server/services/proof-service.ts`
- `CredVerseRecruiter/server/services/proof-verifier-service.ts`

### Rollout

- Standardize proof metadata schema + verifier registry tables.
- Add proof generation/verification jobs via Temporal.
- Rollback: keep existing proof verification engine path as primary until parity tests pass.

---

## 6) Analytics & Observability

### Current state + pain points

- Sentry + structured error improvements exist.
- Metrics/traces/logs are still fragmented; no unified open telemetry pipeline.

### OSS candidates

| Candidate               | License                  | Maturity      | Decision                                 |
| ----------------------- | ------------------------ | ------------- | ---------------------------------------- |
| OpenTelemetry Collector | Apache-2.0               | 6.6k, active  | **Adopt**                                |
| Prometheus + Grafana    | Apache-2.0 + AGPL-3.0    | very mature   | **Adopt (with AGPL review for Grafana)** |
| SigNoz                  | source-available (mixed) | 25.8k, active | **Defer**                                |

### Integration points

- `*/server/middleware/observability.ts`
- `*/server/services/logger.ts`
- `*/server/services/sentry.ts`
- `docs/ops/monitoring-standard.md`

### Rollout

- Instrument HTTP/db/queue spans with OTel SDK.
- Export metrics to Prometheus; dashboards in Grafana.
- Rollback by disabling OTel exporters and retaining current logging/Sentry only.

---

## 7) Workflow / Orchestration

### Current state + pain points

- Issuer has BullMQ queue only; other services rely on sync calls/manual flows.
- Cross-service SLAs (5-min/48h) currently difficult to enforce deterministically.

### OSS candidates

| Candidate      | License    | Maturity                       | Decision           |
| -------------- | ---------- | ------------------------------ | ------------------ |
| Temporal       | MIT        | 18.4k, active                  | **Adopt**          |
| Argo Workflows | Apache-2.0 | 16.4k, active                  | **Defer**          |
| Camunda 7 CE   | Apache-2.0 | 4.2k, low current OSS momentum | **Reject for now** |

### Integration points

- New: `packages/workflows-temporal/*`
- Existing hooks: `CredVerseIssuer 3/server/services/queue-service.ts`, recruiter/workscore routes, compliance timers.

### Rollout

- Start with dispute SLA + ATS verification deadlines.
- Keep BullMQ for local batch until Temporal stable.
- Rollback by toggling workflow execution off and returning to sync paths.

---

## 8) Compliance & Audit

### Current state + pain points

- Compliance routes exist in issuer/recruiter with append-only hash chain in app memory/state-store.
- No immutable external audit store, weak legal-grade retention/search.

### OSS candidates

| Candidate          | License    | Maturity            | Decision                           |
| ------------------ | ---------- | ------------------- | ---------------------------------- |
| immudb             | Apache-2.0 | mature immutable DB | **Adopt**                          |
| OpenSearch         | Apache-2.0 | mature              | **Adopt (for audit search layer)** |
| Hyperledger Fabric | Apache-2.0 | mature but heavy    | **Reject**                         |

### Integration points

- `packages/shared-auth/src/audit-chain.ts`
- `CredVerseIssuer 3/server/routes/compliance.ts`
- `CredVerseRecruiter/server/routes/compliance.ts`

### Rollout

- Dual-write audit events to immudb + existing chain.
- Add export/signature verification endpoint.
- Rollback: continue existing hash-chain only path.

---

## 9) Messaging / Notifications

### Current state + pain points

- Email implementation in issuer is provider-coupled (`Resend` + console fallback).
- No unified event-driven notification bus or retry semantics across services.

### OSS candidates

| Candidate      | License           | Maturity                 | Decision  |
| -------------- | ----------------- | ------------------------ | --------- |
| NATS JetStream | Apache-2.0        | 19.1k, active            | **Adopt** |
| RabbitMQ       | MPL-2.0/EPL mixed | 13.4k, active            | **Defer** |
| Novu           | MIT (core)        | mature OSS notifications | **Defer** |

### Integration points

- `CredVerseIssuer 3/server/services/email.ts`
- `CredVerseIssuer 3/server/services/queue-service.ts`
- Add `packages/notifications/*`

### Rollout

- Publish notification events to NATS; workers deliver email/webhook/push.
- Keep direct email path as fallback.
- Rollback: disable consumer workers, preserve current direct sends.

---

## 10) Fraud Detection

### Current state + pain points

- Deterministic + optional LLM hybrid in recruiter (`fraud-detector.ts`, `ai-anomaly-adapter.ts`).
- No feature store, no drift monitoring, no model registry.

### OSS candidates

| Candidate             | License    | Maturity                     | Decision   |
| --------------------- | ---------- | ---------------------------- | ---------- |
| Feast (feature store) | Apache-2.0 | mature OSS ML infra          | **Defer**  |
| Evidently (drift)     | Apache-2.0 | mature                       | **Adopt**  |
| WhyLabs OSS stack     | mixed      | limited self-host simplicity | **Reject** |

### Integration points

- `CredVerseRecruiter/server/services/fraud-detector.ts`
- `CredVerseRecruiter/server/services/ai-anomaly-adapter.ts`
- `CredVerseRecruiter/server/routes/analytics.ts`

### Rollout

- Add score distribution/drift jobs on verification history.
- Gate auto-reject thresholds behind config.
- Rollback: disable drift jobs; keep current fraud rules.

---

## 11) Policy Engine

### Current state + pain points

- Policy logic currently hardcoded in services/routes.
- Limited explainability/versioning for decisions.

### OSS candidates

| Candidate  | License    | Maturity      | Decision                        |
| ---------- | ---------- | ------------- | ------------------------------- |
| OPA (Rego) | Apache-2.0 | 11.2k, active | **Adopt**                       |
| Cerbos     | Apache-2.0 | 4.2k, active  | **Adopt (for app-level authz)** |
| OpenFGA    | Apache-2.0 | 4.8k, active  | **Adopt (relationship model)**  |

### Integration points

- `packages/shared-auth/src/middleware.ts`
- `CredVerseRecruiter/server/services/workscore.ts`
- `CredVerseIssuer 3/server/routes/compliance.ts`
- New: `packages/policy-rules/*`

### Rollout

- Externalize high-risk decision rules first (gig fast-track, dispute resolution, recruiter approvals).
- Shadow-evaluate old vs new policy in logs.
- Rollback by routing decisions back to current in-code logic.

---

## 12) CI/CD Quality

### Current state + pain points

- Good baseline workflows: `.github/workflows/quality-gates-ci.yml`, `contract-security-ci.yml`, `launch-gate.yml`.
- Gaps: no SBOM/provenance attestation, limited DAST, no unified security dashboard.

### OSS candidates

| Candidate       | License      | Maturity                         | Decision  |
| --------------- | ------------ | -------------------------------- | --------- |
| Trivy           | Apache-2.0   | very mature (stars high, active) | **Adopt** |
| Gitleaks        | MIT          | mature                           | **Adopt** |
| Sigstore Cosign | Apache-2.0   | 5.7k, active                     | **Adopt** |
| DefectDojo      | BSD-3-Clause | 4.5k, active                     | **Defer** |

### Integration points

- `.github/workflows/quality-gates-ci.yml`
- `.github/workflows/contract-security-ci.yml`
- `docs/release/ci-gate-policy.yml`

### Rollout

- Add Trivy fs/image scan + gitleaks pre-merge + cosign attestation on release artifacts.
- Rollback by making scans advisory only if false positives block delivery.

---

## 13) Docs / DevEx

### Current state + pain points

- Docs footprint is large (`docs/*`) but fragmented and not productized as a discoverable portal.
- API docs exist (`docs/openapi/v1.yaml`) but no consolidated service catalog.

### OSS candidates

| Candidate       | License    | Maturity                                         | Decision  |
| --------------- | ---------- | ------------------------------------------------ | --------- |
| Backstage       | Apache-2.0 | mature (rate-limited fetch, known high adoption) | **Adopt** |
| Docusaurus      | MIT        | mature (rate-limited fetch)                      | **Adopt** |
| MkDocs Material | MIT        | mature                                           | **Defer** |

### Integration points

- `docs/openapi/v1.yaml`
- `docs/runbooks/*`, `docs/release/*`, `docs/security/*`
- New: `devex/portal` (Backstage), `docs-site/` (Docusaurus)

### Rollout

- Build single docs portal first; migrate runbooks and APIs incrementally.
- Rollback: retain raw markdown docs as source-of-truth.

---

## 14) Prioritized Top-15 implementation backlog

1. **Introduce OTel collector + service instrumentation** (all services).
2. **Temporal package + first workflow (reputation dispute SLA)**.
3. **Policy externalization v1 (OPA/Cerbos for high-risk decisions)**.
4. **Normalize issuer/recruiter persistence from snapshot maps to relational tables**.
5. **Keycloak OIDC integration through gateway + shared-auth compatibility mode**.
6. **OpenSearch pipeline for verification/compliance/fraud events**.
7. **Immutable audit write path (immudb dual-write) for compliance routes**.
8. **NATS event bus for notifications and cross-service domain events**.
9. **Trivy + Gitleaks + Cosign in CI release chain**.
10. **Proof runtime hardening: verifier registry + artifact lifecycle controls** (`zk` + proof services).
11. **OpenFGA integration for recruiter/issuer org-level relationship auth**.
12. **Fraud drift monitoring with Evidently batch jobs + alerts**.
13. **Envoy-based gateway fronting for authz/rate policies**.
14. **Backstage software catalog for all Credity services/packages**.
15. **Docusaurus docs consolidation with OpenAPI sync and runbook indexing**.

---

## 15) Program risks (cross-cutting) and rollback strategy

### Key risks

- License incompatibilities (AGPL/source-available components in proprietary deployment).
- Dual-write consistency during storage and workflow migration.
- Increased ops burden (Temporal + OTel + OpenSearch + Keycloak).

### Guardrails

- Enforce allowlist: Apache-2.0 / MIT / BSD preferred for runtime deps.
- Feature flags per module (`FEATURE_*`), dark launches, canary tenants.
- Keep legacy paths operational until 2 release cycles pass with SLO green.

### Global rollback plan

- Route-level rollback by feature flag.
- Disable external policy/workflow calls and fall back to in-process logic.
- Maintain backward-compatible payload contracts on all public endpoints.

---

## OSS metadata source note

- Stars/license/activity were pulled from GitHub API during this run for most candidates (2026-02-21 snapshot).
- A few repos hit unauthenticated API rate limits (e.g., Trivy, Backstage, Docusaurus, OpenLineage/Marquez); those are marked and should be refreshed with authenticated API in final governance review.
