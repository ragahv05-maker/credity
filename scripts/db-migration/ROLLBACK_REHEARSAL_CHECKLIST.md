# DB Cloud Migration Rollback Rehearsal Checklist

Purpose: rehearse a <15 minute rollback from Supabase-read mode to source-read mode without data loss.

## Preconditions
- [ ] Staging/preprod environment mirrors prod flags and DB topology.
- [ ] `REQUIRE_DATABASE=true` in all services.
- [ ] Dual-write feature flag exists and is independently controllable from read-path flag.
- [ ] Source DB remains writable during rehearsal window.
- [ ] On-call roles assigned: incident commander, DB operator, app operator, observer.

## Rehearsal Steps (timed)
1. [ ] Start timer and announce rehearsal start.
2. [ ] Validate baseline health endpoints (issuer/wallet/recruiter/gateway).
3. [ ] Confirm current state: reads=target (Supabase), dual-write=ON.
4. [ ] Trigger rollback: switch reads back to source DB.
5. [ ] Keep dual-write ON for at least 10 minutes post-switch.
6. [ ] Run smoke tests for critical flows:
   - [ ] auth/session refresh
   - [ ] issue credential
   - [ ] verify credential/proof
   - [ ] queue/deferred processing
7. [ ] Capture rowcount + state-store verification artifacts:
   - [ ] `scripts/db-migration/03-verify.sh`
   - [ ] `scripts/db-migration/04-method-verify.sh` (fast or exact)
8. [ ] Confirm no sustained 5xx spike and p95 within rollback SLO.
9. [ ] Stop timer; record total rollback time.

## Data Reconciliation Drill
- [ ] Generate diff report source vs target (rowcounts + key-level checksum sample).
- [ ] Identify writes that occurred during rollback window.
- [ ] Validate replay/patch procedure from target back to source (if needed).
- [ ] Record unresolved drift items and owners.

## Exit Criteria
- [ ] Rollback achieved in <= 15 minutes.
- [ ] Critical flow smoke tests pass.
- [ ] State-store keys all present.
- [ ] Reconciliation procedure validated end-to-end.
- [ ] Evidence archived under `scripts/db-migration/artifacts/` and linked in release report.
