# Supabase Migration Checklist

## Pre-migration
- [ ] Freeze schema/code changes for migration window
- [ ] Confirm `REQUIRE_DATABASE=true` in all prod services
- [ ] Confirm source DB credentials and access
- [ ] Confirm Supabase project provisioned (prod/staging)
- [ ] Set `DATABASE_URL` (pooler) and `DATABASE_URL_DIRECT` (direct)
- [ ] Backup source DB (`pg_dump`)

## Schema
- [ ] Create extensions (`pgcrypto`)
- [ ] Create enums (Issuer)
- [ ] Apply Wallet migrations
- [ ] Generate/apply Issuer migrations
- [ ] Generate/apply Recruiter migrations
- [ ] Ensure `credverse_state_store` table exists

## Data backfill
- [ ] Initial full load completed
- [ ] `credverse_state_store` service keys copied
- [ ] Rowcount verification complete
- [ ] Checksum/key-level verification complete

## Zero-downtime rollout
- [ ] Deploy dual-write (source + Supabase)
- [ ] Keep reads on source initially
- [ ] Drift reconciliation job running
- [ ] Flip reads to Supabase
- [ ] Keep dual-write for soak period (24–72h)

## Validation
- [ ] Health endpoints green (issuer/wallet/recruiter/gateway)
- [ ] Critical flows validated (issue, verify, queue, auth)
- [ ] Error rate, p95 latency, DB saturation within SLO

## Finalize
- [ ] Disable writes to source
- [ ] Keep source in read-only/snapshot retention mode
- [ ] Document final migration report
- [ ] Remove dual-write code after sign-off

## Rollback readiness
- [ ] Rollback env switch tested
- [ ] Source DB still writable if rollback needed
- [ ] Data reconciliation script prepared
