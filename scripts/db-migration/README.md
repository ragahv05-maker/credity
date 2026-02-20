# DB Migration Scaffolding (Supabase)

This folder provides **Phase A/B/C scaffolding** for the migration plan in:
- `docs/ops/supabase-migration-runbook.md`
- `docs/ops/supabase-migration-checklist.md`

It is safe to commit as-is (no secrets included).

## Quick start

```bash
cd /Users/raghav/Desktop/credity12
cp scripts/db-migration/env/.env.db-migration.example scripts/db-migration/env/.env.db-migration.local
# fill values in .env.db-migration.local

scripts/db-migration/00-preflight.sh
scripts/db-migration/01-schema-baseline.sh
scripts/db-migration/02-backfill.sh
scripts/db-migration/03-verify.sh
```

## Files
- `00-preflight.sh` – validates tooling/env + prints checklist status
- `01-schema-baseline.sh` – runs baseline SQL (extensions, state-store table)
- `02-backfill.sh` – runs `pg_dump` + `pg_restore` (optional dry-run)
- `03-verify.sh` – executes verification SQL files
- `sql/*.sql` – migration-safe SQL snippets/checks
- `env/.env.db-migration.example` – non-secret env contract template

## Notes
- Keep app traffic on pooler (`DATABASE_URL`) and migration/admin on direct URL (`DATABASE_URL_DIRECT`).
- Scripts use **direct URLs** (`SRC_DB_URL`, `TGT_DB_URL`) for DDL/backfill/verify.
- Issuer enums/table migrations are expected to be applied via per-service Drizzle migration commands from the runbook.
