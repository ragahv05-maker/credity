# Phase C — Agent 4 DB Cloud Cutover Workflow (Operational)

Date: 2026-02-21  
Repo: `/Users/raghav/Desktop/credity`  
Owner lane: Agent 4 (`automation-workflows`, `architecture-decision-records`, `production-code-audit`)

## Scope completed

1. Validated staged runner + method gate scripts.
2. Prepared exact operator command sequence for staging, then production cutover.
3. Validated rollback rehearsal checklist and artifacts format.
4. Produced secrets-ready checklist + missing credentials map.

---

## 1) Validation — staged runner + method gates

### Files reviewed

- `scripts/db-migration/run-staged.sh`
- `scripts/db-migration/00-preflight.sh`
- `scripts/db-migration/01-schema-baseline.sh`
- `scripts/db-migration/02-backfill.sh`
- `scripts/db-migration/03-verify.sh`
- `scripts/db-migration/04-method-verify.sh`
- `scripts/db-migration/lib/common.sh`
- `scripts/db-migration/env/.env.db-migration.example`

### Checks executed

- Shell syntax: `bash -n` on all migration shell scripts ✅
- Executable bits present on all scripts ✅
- DB migration safety audit: `node scripts/db-migration-safety-check.mjs` ✅ (with warnings)

### Findings

- **Runner works as deterministic stage orchestrator** (`preflight|schema|backfill|verify|gate|all`).
- **Method gate is hard-fail capable** on:
  - source/target rowcount mismatch (when `ROWCOUNT_TOLERANCE=0`)
  - missing required `credverse_state_store` keys.
- **Important warnings from safety audit**:
  - `CredVerseIssuer 3` missing committed `drizzle/` migration history.
  - `CredVerseRecruiter` missing committed `migrations/` history.
  - These are rollout risks and should be closed before prod cutover.
- **Logic gap**: `ROWCOUNT_TOLERANCE>0` is currently not implemented as numeric tolerance; only strict equality path is enforced when `ROWCOUNT_TOLERANCE=0`.
- **Doc drift**: runbook still references old path `credity12` in places.

---

## 2) Exact operator command sequence

## 2.1 Staging cutover rehearsal (required before prod)

```bash
cd /Users/raghav/Desktop/credity

# 0) Prepare env contract (no commit)
cp scripts/db-migration/env/.env.db-migration.example scripts/db-migration/env/.env.db-migration.local
# Fill real staging values in .env.db-migration.local

# 1) Tooling + migration safety gate
node scripts/db-migration-safety-check.mjs

# 2) Preflight only
scripts/db-migration/run-staged.sh preflight

# 3) Baseline schema on target
scripts/db-migration/run-staged.sh schema

# 4) Backfill dry-run first
MODE=dry-run scripts/db-migration/run-staged.sh backfill

# 5) Actual backfill
MODE=run scripts/db-migration/run-staged.sh backfill

# 6) Verification snapshot artifacts
scripts/db-migration/run-staged.sh verify

# 7) Hard gate (fast), then exact
VERIFY_METHOD=fast ROWCOUNT_TOLERANCE=0 scripts/db-migration/run-staged.sh gate
VERIFY_METHOD=exact ROWCOUNT_TOLERANCE=0 scripts/db-migration/04-method-verify.sh

# 8) Runtime launch gate + infra smoke (with staging runtime env)
set -a; source .env.launch.local; set +a
LAUNCH_GATE_STRICT=1 node scripts/launch-gate-check.mjs
GATEWAY_URL=https://gateway.<staging-domain> \
ISSUER_URL=https://issuer.<staging-domain> \
WALLET_URL=https://wallet.<staging-domain> \
RECRUITER_URL=https://recruiter.<staging-domain> \
bash scripts/infra-live-smoke.sh
```

## 2.2 Production cutover sequence

```bash
cd /Users/raghav/Desktop/credity

# 0) Freeze window + operator roles confirmed (IC/DB/App/Observer)
# 1) Confirm production env loaded locally (NOT committed)
set -a; source .env.launch.local; set +a

# 2) Mandatory launch hardening gate
LAUNCH_GATE_STRICT=1 node scripts/launch-gate-check.mjs

# 3) Prepare db migration env
cp scripts/db-migration/env/.env.db-migration.example scripts/db-migration/env/.env.db-migration.local
# Fill production SRC_DB_URL/TGT_DB_URL and direct/pooler URLs

# 4) Execute staged DB migration workflow
scripts/db-migration/run-staged.sh all

# 5) Additional strict verification pass
VERIFY_METHOD=exact ROWCOUNT_TOLERANCE=0 scripts/db-migration/04-method-verify.sh

# 6) Flip reads to target (Supabase) with dual-write still ON (platform flag rollout)
# 7) Run production smoke checks
GATEWAY_URL=https://gateway.<prod-domain> \
ISSUER_URL=https://issuer.<prod-domain> \
WALLET_URL=https://wallet.<prod-domain> \
RECRUITER_URL=https://recruiter.<prod-domain> \
bash scripts/infra-live-smoke.sh

# 8) Archive evidence artifacts
ls -la scripts/db-migration/artifacts
ls -la scripts/db-migration/artifacts/verify
```

---

## 3) Rollback rehearsal checklist + artifacts validation

Reviewed: `scripts/db-migration/ROLLBACK_REHEARSAL_CHECKLIST.md`.

### Checklist quality

- Covers timed rollback target (`<=15 min`).
- Enforces read-path reversal + dual-write grace period.
- Includes critical smoke path validation.
- Includes reconciliation drill and exit criteria.

### Artifact format validation

Expected artifact paths (consistent with scripts):

- `scripts/db-migration/artifacts/credity-full.dump`
- `scripts/db-migration/artifacts/verify/src-rowcounts-<ts>.txt`
- `scripts/db-migration/artifacts/verify/tgt-rowcounts-<ts>.txt`
- `scripts/db-migration/artifacts/verify/rowcount-diff-<ts>.patch`
- `scripts/db-migration/artifacts/verify/tgt-state-store-<ts>.txt`
- `scripts/db-migration/artifacts/verify/src-method-<fast|exact>-<ts>.txt`
- `scripts/db-migration/artifacts/verify/tgt-method-<fast|exact>-<ts>.txt`
- `scripts/db-migration/artifacts/verify/method-diff-<fast|exact>-<ts>.patch`
- `scripts/db-migration/artifacts/verify/state-store-gate-<ts>.txt`

Result: artifact naming and location are operationally usable for release evidence.

---

## 4) Secrets-ready checklist + missing credentials map

## 4.1 DB cutover required secret/env set

- `SRC_DB_URL` (source direct)
- `TGT_DB_URL` (supabase direct)
- `DATABASE_URL` (pooler runtime)
- `DATABASE_URL_DIRECT` (direct migration/admin)
- `REQUIRE_DATABASE=true`

## 4.2 Runtime hardening/env set (launch gate strict)

- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `REDIS_URL`
- `SENTRY_DSN` or `GATEWAY_SENTRY_DSN`
- `NODE_ENV=production`
- `ALLOW_DEMO_ROUTES=false`
- `REQUIRE_QUEUE=true`
- `ISSUER_KEY_ENCRYPTION` (64-char hex)
- `RELAYER_PRIVATE_KEY`
- `REGISTRY_CONTRACT_ADDRESS`
- chain RPC: one of `SEPOLIA_RPC_URL | CHAIN_RPC_URL | RPC_URL`

## 4.3 Missing credentials/config map (repo-local observed)

- `scripts/db-migration/env/.env.db-migration.local` → **missing** (must be created per environment).
- Launch strict gate run against current `.env.launch.local` failed these required checks:
  - `NODE_ENV=production` missing/wrong
  - `ALLOW_DEMO_ROUTES=false` missing/wrong
  - `REQUIRE_DATABASE=true` missing/wrong
  - `REQUIRE_QUEUE=true` missing/wrong
  - `ISSUER_KEY_ENCRYPTION` missing
  - `ISSUER_KEY_ENCRYPTION` not 64-hex (format fail)

No secret values are included in this report.

---

## 5) Go/No-Go recommendation

Current state: **NO-GO for production cutover** until below are closed:

1. Add and validate `scripts/db-migration/env/.env.db-migration.local` with real prod values.
2. Pass `LAUNCH_GATE_STRICT=1 node scripts/launch-gate-check.mjs` with production env.
3. Commit/verify issuer + recruiter SQL migration histories (or formally waive with rollback owner sign-off).
4. Execute full staging rehearsal including rollback checklist and artifact archival.

After closure: proceed with production sequence in section 2.2.
