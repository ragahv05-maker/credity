# Credity Swarm S08 — Queue/Deferred Reliability Improvements

## Scope

Worked in `CredVerseIssuer 3` to improve queue/deferred-mode reliability while preserving existing behavior and API contracts.

## What I changed

### 1) Issuance queue retry/backoff reliability (`server/services/queue-service.ts`)

- Added configurable retry/backoff parameters (with safe defaults preserving previous behavior):
  - `ISSUANCE_JOB_ATTEMPTS` (default `3`)
  - `ISSUANCE_BACKOFF_DELAY_MS` (default `1000`)
  - `ISSUANCE_BACKOFF_MAX_DELAY_MS` (default `30000`)
- Added normalized retry config resolver to guard invalid env values.
- Improved queue lifecycle visibility with `QueueEvents` listeners (`failed`, `stalled`, `completed`) logging useful operational signals.
- **Reliability fix:** dead-letter enqueue now happens only after final retry exhaustion, not on intermediate failed attempts.
  - Intermediate failures are now recorded as attempt-level errors and marked as retrying.
  - Final failure updates status to `failed` and pushes to DLQ.
- Added `getQueueReliabilityConfig()` export for runtime introspection of retry/backoff + DLQ availability.

### 2) Queue dead-letter visibility in API (`server/routes/issuance.ts`)

- `/queue/stats` now returns:
  - `queue.stats` (existing)
  - `queue.reliability` (new retry/backoff/DLQ config snapshot)
- `/queue/dead-letter` now also returns `reliability` metadata for operators.

### 3) Deferred/anchor reliability visibility (`server/services/anchor-batch-service.ts`)

- Added exponential retry guidance metadata for failed anchor batches:
  - `nextRetryAt`
  - `retryAfterSeconds`
- New env knobs (defaults chosen to preserve behavior and only add visibility):
  - `ANCHOR_RETRY_BASE_DELAY_MS` (default `5000`)
  - `ANCHOR_RETRY_MAX_DELAY_MS` (default `300000`)
- On replay, dead-letter entry is cleared before re-anchoring attempt to avoid stale DLQ state.

### 4) OID4VCI deferred retry timing configurability (`server/routes/standards.ts`)

- `POST /api/v1/oid4vci/deferred` now uses configurable retry hint:
  - `OID4VCI_DEFERRED_RETRY_AFTER_SECONDS` (default `5`)
- Existing response contract preserved (`retry_after` still returned).

## Tests added/updated

### Updated

- `tests/queue-service.test.ts`
  - Added assertion for `getQueueReliabilityConfig()` (attempts/backoff present, DLQ availability false when queue unavailable).
- `tests/anchor-batch-service.test.ts`
  - Added assertions that failed anchor batches include `retryAfterSeconds` and `nextRetryAt` in dead-letter entries.

## Verification run

Executed:

- `npm test -- tests/queue-service.test.ts tests/anchor-batch-service.test.ts`

Result:

- 2 test files passed
- 8 tests passed

## Notes

- Changes are backward-compatible by default (same retry attempts/backoff defaults, same endpoint paths/primary payloads).
- Main behavioral hardening is preventing premature DLQ insertion before retries are exhausted.
