# Phase A DB Migration Prep Report

Date: 2026-02-20  
Repo: `/Users/raghav/Desktop/credity12`

## Scope completed
Prepared executable migration scaffolding based on:
- `docs/ops/supabase-migration-runbook.md`
- `docs/ops/supabase-migration-checklist.md`

All outputs were created without secrets.

## Artifacts created
Under `scripts/db-migration/`:

1. Shell runners
- `00-preflight.sh`
- `01-schema-baseline.sh`
- `02-backfill.sh`
- `03-verify.sh`
- `lib/common.sh`

2. SQL verification/baseline files
- `sql/001_extensions.sql`
- `sql/010_ensure_state_store.sql`
- `sql/100_verify_rowcounts.sql`
- `sql/101_verify_state_store.sql`
- `sql/102_verify_checksums_template.sql`

3. Environment template
- `env/.env.db-migration.example`

4. Usage doc
- `README.md`

## Checklist mapping (what this scaffolding enables)
- Pre-migration: tooling/env/connectivity validation (`00-preflight.sh`)
- Schema: extension + state-store baseline (`01-schema-baseline.sh`)
- Data backfill: dump/restore workflow (`02-backfill.sh`)
- Verification: rowcount/state-store checks + checksum template (`03-verify.sh` + SQL)

## Important notes
- Drizzle migrations for Wallet/Issuer/Recruiter are intentionally not auto-run in this scaffolding; they should follow the runbook per service using `DATABASE_URL_DIRECT`.
- `02-backfill.sh` supports `MODE=dry-run` for safe rehearsal.
- Verification artifacts are written under `scripts/db-migration/artifacts/verify` by default.

## Next execution sequence
1. Copy env template and fill real values:
   - `cp scripts/db-migration/env/.env.db-migration.example scripts/db-migration/env/.env.db-migration.local`
2. Run:
   - `scripts/db-migration/00-preflight.sh`
   - `scripts/db-migration/01-schema-baseline.sh`
   - run per-service Drizzle migration steps from runbook
   - `scripts/db-migration/02-backfill.sh`
   - `scripts/db-migration/03-verify.sh`
