# Supabase Postgres Migration Runbook (Production Grade)

**Repo:** `/Users/raghav/Desktop/credity12`  
**Goal:** migrate all runtime persistence to Supabase Postgres (or equivalent managed Postgres) with zero downtime.

---

## 1) Current Persistence Inventory (as-is)

## 1.1 Relational schemas (Drizzle)

### A) `BlockWalletDigi/shared/schema.ts`
Tables:
- `users`
- `credentials`
- `activities`
- `otp_codes`
- `device_fingerprints`
- `claims`
- `evidence`
- `subscriptions`
- `api_usage`
- `platform_connections`
- `reputation_events`
- `reputation_scores`
- `safedate_scores`

Migration currently present:
- `BlockWalletDigi/migrations/0000_fuzzy_cammi.sql`

### B) `CredVerseIssuer 3/shared/schema.ts`
Enums:
- `trust_status`, `student_status`, `team_role`, `team_status`, `verification_status`, `reputation_category`, `reputation_vertical`, `platform_authority_status`

Tables:
- `tenants`
- `api_keys`
- `issuers`
- `users`
- `templates`
- `credentials`
- `trust_score_snapshots`
- `platform_authorities`
- `reputation_events`
- `reputation_signal_snapshots`
- `reputation_scores`
- `reputation_share_grants`
- `consent_grants`
- `students`
- `team_members`
- `verification_logs`
- `activity_logs`
- `template_designs`

### C) `CredVerseRecruiter/shared/schema.ts`
Tables:
- `users`

---

## 1.2 JSON state-store persistence (`packages/shared-auth/src/postgres-state-store.ts`)

A generic table is auto-created:
- `credverse_state_store(service_key text primary key, payload jsonb, updated_at timestamptz)`

Known `service_key` values in code:
- `wallet-storage`
- `issuer-storage`
- `recruiter-storage`
- `issuer-queue-runtime`
- `issuer-status-list`
- `issuer-anchor-batches`
- `issuer-compliance`
- `issuer-oid4vci-runtime`
- `issuer-digilocker-user-pull-state`
- `recruiter-compliance`
- `recruiter-oid4vp-requests`
- `recruiter-verification-engine`

---

## 1.3 Runtime fallback behavior (important risk)

Current services can run in-memory if DB is absent unless strict mode enabled:
- `REQUIRE_DATABASE=true` (or `NODE_ENV=production`) enforces DB presence.

This means migration must ensure strict mode is ON in all prod environments before cutover.

---

## 2) Target Architecture (Supabase)

- **Single Supabase Postgres project** (prod)
- Optional separate Supabase projects for staging/preprod
- Use:
  - **Session/transaction pooler URL** for application traffic
  - **Direct DB URL** for migrations, admin ops, `pg_dump/pg_restore`
- Keep Redis external for queue/session workloads (`REDIS_URL` remains unchanged)

---

## 3) Environment Variable Contract (final)

Use these env vars across services:

```env
# Required
DATABASE_URL=postgresql://<user>:<pass>@<pooler-host>:6543/postgres?sslmode=require&pgbouncer=true
DATABASE_URL_DIRECT=postgresql://<user>:<pass>@<db-host>:5432/postgres?sslmode=require
REQUIRE_DATABASE=true

# Optional hardening
DB_POOL_MAX=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=5000
DB_SSL_MODE=require
DB_APPLICATION_NAME=credity-<service>
```

Per existing app contract (already in repo):
- `REDIS_URL` (issuer/gateway queue/session)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `ALLOWED_ORIGINS`
- issuer-specific chain keys, etc.

> Implementation note: Drizzle/pg code today reads `DATABASE_URL`. Keep that as pooler URL. Use `DATABASE_URL_DIRECT` only in migration scripts and admin commands.

---

## 4) Connection Pooling + SSL Recommendations

1. **Application traffic**
   - point `DATABASE_URL` to Supabase **pooler endpoint**
   - include `sslmode=require`
   - include `pgbouncer=true` when using transaction pooling

2. **Migrations/backfills/admin**
   - use `DATABASE_URL_DIRECT` (port 5432)
   - avoids pooler limitations during DDL/long transactions

3. **Node pg settings**
   - cap per-service pool size (`max`) to 5–15
   - do not rely on `rejectUnauthorized:false` for long-term; prefer proper CA verification where possible

4. **Operational**
   - set `application_name` per service to ease query tracing
   - monitor connection saturation and long transactions in Supabase dashboard

---

## 5) Zero-Downtime Migration Strategy

Use **expand → dual-write → verify → cutover → contract**.

### Phase A — Preflight
1. Freeze schema changes on main for migration window.
2. Enable strict persistence in all environments:
   - `REQUIRE_DATABASE=true`
3. Ensure all services currently run against source DB (not in-memory only).
4. Take source backup.

### Phase B — Provision + Baseline Schema on Supabase
1. Create Supabase project.
2. Apply schema in safe order (Section 6).
3. Create required extensions and enums first.

### Phase C — Initial Data Backfill
1. Copy relational tables from source -> Supabase.
2. Copy `credverse_state_store` rows.
3. Run rowcount/hash verification (Section 7).

### Phase D — Dual-write window (no downtime)
1. Deploy app update to write to **both source and Supabase** (feature flag).
2. Read path remains source primary.
3. Continuously reconcile drift from source->target.

### Phase E — Cutover
1. Flip read path to Supabase (single feature flag or env switch).
2. Keep dual-write ON for soak period (24–72h).
3. Watch SLOs, error rates, DB metrics.

### Phase F — Finalize
1. Disable writes to source.
2. Keep source snapshot for rollback window.
3. Remove dual-write code after stability sign-off.

---

## 6) SQL Migration Order (exact order)

Run in this sequence:

1. **Extensions**
   - `CREATE EXTENSION IF NOT EXISTS pgcrypto;`

2. **Enums (Issuer schema)**
   - `trust_status`, `student_status`, `team_role`, `team_status`, `verification_status`, `reputation_category`, `reputation_vertical`, `platform_authority_status`

3. **Foundational tables**
   - `tenants`, `users` (issuer), `users` (wallet/recruiter namespaces strategy below)

4. **Issuer dependency chain**
   - `api_keys`, `issuers`, `templates`, `credentials`
   - then remaining issuer analytics/ops tables

5. **Wallet tables**
   - as in `0000_fuzzy_cammi.sql`

6. **Recruiter tables**
   - recruiter `users`

7. **State store table**
   - `credverse_state_store`

8. **Indexes/constraints not critical for boot**
   - unique keys, additional operational indexes

### Namespace collision decision
Because all apps use `public` by default and multiple define `users`, pick one:
- **Preferred:** separate schemas (`wallet.users`, `issuer.users`, `recruiter.users`) and set `search_path` per service.
- **Minimal-change fallback:** keep current shared `public.users` only if data model compatibility is guaranteed (not recommended).

---

## 7) Backfill + Verification Plan

## 7.1 Backfill commands

> Replace placeholders before running.

```bash
# Source and target URLs
export SRC_DB_URL='postgresql://<src_user>:<src_pass>@<src_host>:5432/<src_db>?sslmode=require'
export TGT_DB_URL='postgresql://<supabase_user>:<supabase_pass>@<supabase_host>:5432/postgres?sslmode=require'

# 1) Full dump (schema+data) from source
pg_dump "$SRC_DB_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file /tmp/credity-full.dump

# 2) Restore to target (clean idempotent pass for non-prod)
pg_restore \
  --no-owner \
  --no-privileges \
  --verbose \
  --dbname "$TGT_DB_URL" \
  /tmp/credity-full.dump
```

If you must avoid full dump, do per-table copy:

```bash
# Example table copy
psql "$SRC_DB_URL" -c "\copy public.credentials to '/tmp/credentials.csv' csv header"
psql "$TGT_DB_URL" -c "\copy public.credentials from '/tmp/credentials.csv' csv header"
```

## 7.2 Verification queries

```sql
-- Row counts per table
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY relname;

-- State store presence
SELECT service_key, updated_at
FROM credverse_state_store
ORDER BY service_key;
```

For strict verification, run checksums on business keys:

```sql
-- Example checksum pattern
SELECT md5(string_agg(id::text, ',' ORDER BY id)) AS checksum_users
FROM users;
```

Acceptance criteria:
- rowcount deltas = 0 (or documented expected drift)
- all `service_key` rows present
- auth/session/token flows pass smoke tests
- issuance/verification critical flows pass end-to-end

---

## 8) Rollback Plan

Rollback trigger examples:
- p95 latency regression > 30%
- sustained 5xx increase
- data mismatch in critical tables

Rollback steps (<= 15 min target):
1. Switch read path back to source DB (feature flag/env rollback).
2. Keep dual-write ON temporarily to avoid data loss.
3. Validate critical endpoints.
4. Announce incident + start reconciliation diff from Supabase back to source.

Post-rollback:
- run diff report (rowcount + key-level comparison)
- patch source from Supabase writes during failed window if required

---

## 9) Exact Execution Commands (repo-specific)

From repo root:

```bash
cd /Users/raghav/Desktop/credity12

# Install deps once
npm ci
(cd packages/shared-auth && npm ci && npm run build)

# Safety check existing migration assets
node scripts/db-migration-safety-check.mjs
```

Generate/apply Drizzle migrations:

```bash
# Wallet
cd BlockWalletDigi
export DATABASE_URL="$DATABASE_URL_DIRECT"
npx drizzle-kit generate
npx drizzle-kit migrate

# Issuer
cd ../"CredVerseIssuer 3"
export DATABASE_URL="$DATABASE_URL_DIRECT"
npx drizzle-kit generate
npx drizzle-kit migrate

# Recruiter
cd ../CredVerseRecruiter
export DATABASE_URL="$DATABASE_URL_DIRECT"
npx drizzle-kit generate
npx drizzle-kit migrate
```

Run production smoke tests after cutover:

```bash
cd /Users/raghav/Desktop/credity12
npm run test:wallet
npm run test:issuer
npm run test:recruiter
npm run test:gateway
```

Health checks:

```bash
curl -fsS https://issuer.<domain>/api/health
curl -fsS https://wallet.<domain>/api/health
curl -fsS https://recruiter.<domain>/api/health
curl -fsS https://gateway.<domain>/api/health
```

---

## 10) Recommended Hardening Before Final Cutover

1. Add dedicated SQL migration folders for Issuer/Recruiter if missing in VCS.
2. Add per-service DB schema (`issuer`, `wallet`, `recruiter`) to avoid table name collisions.
3. Add migration CI gate (fail on drift).
4. Add read/write DB health probes and migration version endpoint.
5. Encrypt high-risk columns (OAuth tokens) at application level before DB write.

---

## 11) Ownership + Change Control

- Change owner: Platform/Infra
- Approvers: Backend lead + SRE
- Freeze window: required
- Rollback window: 7 days minimum retention of source DB
