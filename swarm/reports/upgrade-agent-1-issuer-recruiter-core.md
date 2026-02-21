# Upgrade Agent 1 — Issuer + Recruiter Core (OSS execution lane)

## Scope delivered

Focused implementation for:

1. workflow orchestration hooks
2. policy-engine integration points
3. compliance/audit hardening

## Branch

`feat/issuer-recruiter-oss-hooks-audit-hardening`

## Implemented changes

### 1) Recruiter policy-engine hook (json-rules-engine)

- Added dependency:
  - `CredVerseRecruiter/package.json`
  - `CredVerseRecruiter/package-lock.json`
- New policy service:
  - `CredVerseRecruiter/server/services/workscore-policy-service.ts`
- Integrated into WorkScore evaluation path:
  - `CredVerseRecruiter/server/routes/workscore.ts`

Behavior:

- Feature flag gate: `FEATURE_WORKSCORE_POLICY_ENGINE=true`
- Policy evaluates evidence strength and risk signals.
- Decision can be safely downgraded (`HIRE_FAST` -> `REVIEW` / `INVESTIGATE_REJECT`) for fail-closed posture.
- Response now includes:
  - `policy.enabled`
  - `policy.matched_rules`
  - orchestration metadata (`workflow_hint`, `policy_engine`)

### 2) Issuer workflow orchestration hook points

- Extended queue service integration surface:
  - `CredVerseIssuer 3/server/services/queue-service.ts`

Added:

- `registerQueueWorkflowHook(hook)`
- emitted hook events on:
  - `job.queued`
  - `job.processing`
  - `job.completed`
  - `job.failed`
  - `job.deadlettered`

This creates integration points for Temporal/worker orchestration without breaking current BullMQ runtime.

### 3) Compliance/audit hardening (Issuer + Recruiter)

- Updated compliance routes:
  - `CredVerseIssuer 3/server/routes/compliance.ts`
  - `CredVerseRecruiter/server/routes/compliance.ts`

Hardening implemented:

- Idempotent mutation support via `Idempotency-Key` header.
- Request body hash binding for idempotency replay safety.
- Stored idempotency ledger in compliance state (persisted through existing state store path).
- Audit payload enrichment with:
  - `request_id` (from `X-Request-Id`)
  - `idempotency_key`

## Tests added/updated

- `CredVerseRecruiter/tests/workscore-persistence-route.test.ts`
  - new policy-engine downgrade behavior test
- `CredVerseRecruiter/tests/compliance.test.ts`
  - new idempotent consent replay test
- `CredVerseIssuer 3/tests/compliance.test.ts`
  - new idempotent consent replay test

## Evidence (executed)

### Recruiter targeted tests

`cd CredVerseRecruiter && npm test -- tests/compliance.test.ts tests/workscore-persistence-route.test.ts`

- PASS: 2 files, 8 tests

### Issuer targeted tests

`cd "CredVerseIssuer 3" && npm test -- tests/compliance.test.ts`

- PASS: 1 file, 3 tests

### Recruiter type-check

`cd CredVerseRecruiter && npm run check`

- PASS

## Notes / caveats

- `cd "CredVerseIssuer 3" && npm run check` still reports pre-existing unrelated TS issues (`two-factor.ts`, auth type augmentation mismatch). Not introduced by this change set.
- Changes are additive and feature-flagged where policy behavior could alter decisions.
