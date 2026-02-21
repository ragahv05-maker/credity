# Prod Phase Lane 3 — DB Cloud Migration Operationalization

Date: 2026-02-21  
Repo: `/Users/raghav/Desktop/credity`  
Scope: Convert Supabase migration runbook + checklist into executable staged procedure with verifiable gates (no secrets).

## 1) Production Code Audit (lane-3 focus)

Reviewed:

- `docs/ops/supabase-migration-runbook.md`
- `docs/ops/supabase-migration-checklist.md`
- Existing migration scaffolding under `scripts/db-migration/`

Findings:

1. **Good baseline present**: preflight/schema/backfill/verify scripts already existed for Phase A/B/C.
2. **Operational gaps**:
   - Missing committed env template referenced by docs (`env/.env.db-migration.example` absent).
   - No single staged runner to execute phase sequence consistently.
   - Verification script produced artifacts but lacked **hard gate fail criteria** for method verification.
   - No dedicated rollback rehearsal checklist in migration script pack.
3. **Doc drift**: quick-start path used `credity12` instead of current repo path.

Risk posture before update: **Medium** (execution consistency + verification strictness gaps).

## 2) Architecture Decision Record (light ADR)

### ADR-DB-01: Staged migration execution wrapper

- **Decision**: Add `scripts/db-migration/run-staged.sh` with stage selector (`preflight|schema|backfill|verify|gate|all`).
- **Why**: Lowers operator error in migration window; aligns runbook phases with executable steps.
- **Consequence**: Deterministic phase order for rehearsals and production cutover.

### ADR-DB-02: Verification must be gateable, not advisory

- **Decision**: Add `scripts/db-migration/04-method-verify.sh` as a hard gate:
  - compares source/target rowcounts (`fast` via `pg_stat_user_tables`, or `exact` via `count(*)`)
  - validates required `credverse_state_store` keys are all present
  - fails non-zero when checks fail
- **Why**: Moves verification from “manual review artifact” to enforceable deploy gate.
- **Consequence**: Supports CI/manual go-no-go with explicit pass/fail semantics.

### ADR-DB-03: Rollback rehearsal must be timed and evidence-backed

- **Decision**: Add `scripts/db-migration/ROLLBACK_REHEARSAL_CHECKLIST.md`.
- **Why**: Runbook has rollback strategy, but release gate needs repeatable rehearsal proof (<=15 min target).
- **Consequence**: Better incident readiness and compliance evidence.

## 3) Automation Workflow Updates Delivered

### Added

1. `scripts/db-migration/env/.env.db-migration.example`
   - Non-secret env contract template for source/target/pooler/direct URLs and required flags.

2. `scripts/db-migration/run-staged.sh`
   - End-to-end orchestration or per-stage execution.

3. `scripts/db-migration/04-method-verify.sh`
   - Hard-gate verification with artifact outputs and fail-fast behavior.

4. `scripts/db-migration/ROLLBACK_REHEARSAL_CHECKLIST.md`
   - Operational rollback drill checklist with timed sequence and reconciliation drill.

### Updated

5. `scripts/db-migration/README.md`
   - Corrected repo path (`credity`), updated quick start, documented new scripts/checklist.

## 4) Verification of Script Quality (no secrets run)

Performed local static checks:

- `bash -n scripts/db-migration/04-method-verify.sh` ✅
- `bash -n scripts/db-migration/run-staged.sh` ✅
- executable bit set for both scripts ✅

Not executed against DB endpoints due to intentional no-secrets constraint.

## 5) How to run (operator procedure)

```bash
cd /Users/raghav/Desktop/credity
cp scripts/db-migration/env/.env.db-migration.example scripts/db-migration/env/.env.db-migration.local
# fill local env with real connection values

# Full staged workflow
scripts/db-migration/run-staged.sh all

# Optional strict method gate using exact counts
VERIFY_METHOD=exact scripts/db-migration/04-method-verify.sh
```

## 6) Remaining recommended next step

Before production window, run one **staging rollback rehearsal** using:

- `scripts/db-migration/ROLLBACK_REHEARSAL_CHECKLIST.md`
- evidence artifacts from `scripts/db-migration/artifacts/verify/`

and attach evidence to release gate.

---

Status: **Lane-3 objective completed** (workflow operationalized + verification gates + rollback rehearsal checklist).
