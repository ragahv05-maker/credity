# Credity S26 — Env Templates + Secrets Guidance Consolidation

## Scope completed

Consolidated the current environment/secret requirements across:

- `.env.launch.example`
- `DEPLOYMENT.md`
- `infra/gcp/cloudrun/env.example.yaml`
- `infra/gcp/cloudrun/services.yaml`
- `docs/gates/production-launch-gate.md`
- `scripts/launch-gate-check.mjs`
- `apps/mobile/.env.example`

No real secrets are included below (placeholders only).

---

## 1) Strict launch gate keys (clear required set)

`npm run gate:launch:strict` enforces these runtime keys as **required**:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_URL`
- `SENTRY_DSN` **or** `GATEWAY_SENTRY_DSN` (at least one)

Also required by launch gate (non-env artifacts):

- `docs/runbooks/incident-response.md`
- `docs/runbooks/rollback.md`
- `docs/gates/production-launch-gate.md`
- `docs/compliance/launch-evidence-template.md`

Source of truth: `scripts/launch-gate-check.mjs`.

---

## 2) Consolidated env templates (dev / staging / prod)

> These are sanitized templates for standardization. Keep real values in secret manager/runtime env, never in git.

### A) `.env.dev.example`

```dotenv
# Local development defaults
NODE_ENV=development
ALLOW_DEMO_ROUTES=false
REQUIRE_DATABASE=false
REQUIRE_QUEUE=false
BLOCKCHAIN_ANCHOR_MODE=async

# Shared auth (dev/test values only)
JWT_SECRET=dev-only-replace-me
JWT_REFRESH_SECRET=dev-only-replace-me

# Optional local infra
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/credity
REDIS_URL=redis://localhost:6379/0

# Issuer crypto (dev only)
ISSUER_KEY_ENCRYPTION=replace-with-64-char-hex
ISSUER_KEY_ENCRYPTION_PREVIOUS=
RELAYER_PRIVATE_KEY=0xreplace-with-32-byte-hex

# Observability (optional in dev)
SENTRY_DSN=
GATEWAY_SENTRY_DSN=

# Gateway OAuth (optional in dev)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5173/api/auth/google/callback

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5001,http://localhost:5002,http://localhost:5003
```

### B) `.env.staging.example`

```dotenv
NODE_ENV=production
ALLOW_DEMO_ROUTES=false
REQUIRE_DATABASE=true
REQUIRE_QUEUE=true
BLOCKCHAIN_ANCHOR_MODE=async

JWT_SECRET=replace-with-64-char-random-hex
JWT_REFRESH_SECRET=replace-with-64-char-random-hex

DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/<db>
REDIS_URL=redis://<user>:<pass>@<host>:6379/0

ISSUER_KEY_ENCRYPTION=replace-with-64-char-hex
ISSUER_KEY_ENCRYPTION_PREVIOUS=
RELAYER_PRIVATE_KEY=0xreplace-with-32-byte-hex

SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
GATEWAY_SENTRY_DSN=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://gateway.staging.example.com/api/auth/google/callback

ALLOWED_ORIGINS=https://gateway.staging.example.com,https://issuer.staging.example.com,https://wallet.staging.example.com,https://recruiter.staging.example.com
```

### C) `.env.prod.example`

```dotenv
NODE_ENV=production
ALLOW_DEMO_ROUTES=false
REQUIRE_DATABASE=true
REQUIRE_QUEUE=true
BLOCKCHAIN_ANCHOR_MODE=async

# STRICT GATE REQUIRED
JWT_SECRET=from-secret-manager
JWT_REFRESH_SECRET=from-secret-manager
REDIS_URL=from-secret-manager
# At least one required for strict launch gate
SENTRY_DSN=from-secret-manager
GATEWAY_SENTRY_DSN=from-secret-manager

# Core runtime secrets
DATABASE_URL=from-secret-manager
ISSUER_KEY_ENCRYPTION=from-secret-manager
ISSUER_KEY_ENCRYPTION_PREVIOUS=from-secret-manager
RELAYER_PRIVATE_KEY=from-secret-manager

# Optional/feature secrets
GOOGLE_CLIENT_ID=from-secret-manager
GOOGLE_CLIENT_SECRET=from-secret-manager
GOOGLE_REDIRECT_URI=https://gateway.credity.in/api/auth/google/callback
REGISTRY_CONTRACT_ADDRESS=from-secret-manager
CREDENTIAL_WEBHOOK_SECRET=from-secret-manager
DEEPFAKE_API_KEY=from-secret-manager

ALLOWED_ORIGINS=https://gateway.credity.in,https://issuer.credity.in,https://wallet.credity.in,https://verify.credity.in
```

---

## 3) Secret handling guidance (standardized)

- **Production/staging:** use cloud secret manager only (GCP Secret Manager already reflected in `infra/gcp/cloudrun/env.example.yaml`).
- **Do not commit**: `.env`, `.env.local`, `.env.*.local`, or any value-bearing secrets file.
- **Rotation-sensitive keys:**
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`
  - `ISSUER_KEY_ENCRYPTION` (+ temporary `ISSUER_KEY_ENCRYPTION_PREVIOUS` during rotation)
  - `RELAYER_PRIVATE_KEY`
- **Queue/database hard fail in prod:** keep `REQUIRE_DATABASE=true` and `REQUIRE_QUEUE=true`.
- **Demo routes blocked in prod:** `ALLOW_DEMO_ROUTES=false`.

---

## 4) Current-state alignment check

### Already present and aligned

- Strict gate env requirements are implemented in `scripts/launch-gate-check.mjs`.
- Launch-gate example file exists: `.env.launch.example`.
- Production baseline flags are present in infra/docs (`REQUIRE_DATABASE=true`, `REQUIRE_QUEUE=true`, `ALLOW_DEMO_ROUTES=false`).
- Secret-manager mapping exists (`infra/gcp/cloudrun/env.example.yaml`).

### Gaps found

- Env examples are spread across multiple files and not organized as explicit `dev/staging/prod` templates in one place.
- Strict-gate required keys are present, but not highlighted as a dedicated “must set before strict gate” block in all deployment docs.

---

## 5) Recommended follow-up (small, safe)

1. Add root-level files:
   - `.env.dev.example`
   - `.env.staging.example`
   - `.env.prod.example`
2. In `DEPLOYMENT.md`, add a short **Strict Launch Gate Required Keys** box listing:
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, `SENTRY_DSN|GATEWAY_SENTRY_DSN`.
3. Keep `.env.launch.example` as CI/operator quick-check template.

---

## 6) Validation command

Use this before release:

```bash
LAUNCH_GATE_STRICT=1 npm run gate:launch
# or
npm run gate:launch:strict
```

Expected: all checks PASS; command exits `0`.
