# Credity S23 — Staging Compose/Runtime Template

Prepared a staging-ready Docker Compose template (gateway/wallet/issuer/recruiter) with explicit env wiring, safe defaults, and no secret values.

## 1) `docker-compose.staging.yml` (template)

```yaml
name: credity-staging

services:
  gateway:
    image: ghcr.io/credity/credverse-gateway:staging
    restart: unless-stopped
    ports:
      - "5173:5173"
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 5173
      APP_NAME: credverse-gateway
      APP_VERSION: ${APP_VERSION:-staging}

      # Strict runtime posture
      REQUIRE_DATABASE: ${REQUIRE_DATABASE:-true}

      # Shared auth/session
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      REDIS_URL: ${REDIS_URL}

      # OAuth (optional but recommended)
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
      GOOGLE_REDIRECT_URI: ${GOOGLE_REDIRECT_URI:-https://gateway.staging.example.com/api/auth/google/callback}

      # Cross-service API routing
      WALLET_API_URL: ${WALLET_API_URL:-http://wallet:5002}
      ISSUER_API_URL: ${ISSUER_API_URL:-http://issuer:5001}
      RECRUITER_API_URL: ${RECRUITER_API_URL:-http://recruiter:5003}

      # Frontend portal links rendered by gateway UI
      VITE_WALLET_URL: ${VITE_WALLET_URL:-https://wallet.staging.example.com}
      VITE_ISSUER_URL: ${VITE_ISSUER_URL:-https://issuer.staging.example.com}
      VITE_RECRUITER_URL: ${VITE_RECRUITER_URL:-https://recruiter.staging.example.com}

      # Security/telemetry
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-https://gateway.staging.example.com,https://wallet.staging.example.com,https://issuer.staging.example.com,https://recruiter.staging.example.com}
      SENTRY_DSN: ${GATEWAY_SENTRY_DSN:-}
      LOG_LEVEL: ${LOG_LEVEL:-info}

    depends_on:
      - wallet
      - issuer
      - recruiter

  wallet:
    image: ghcr.io/credity/blockwalletdigi:staging
    restart: unless-stopped
    ports:
      - "5002:5002"
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 5002
      APP_NAME: credverse-wallet
      APP_VERSION: ${APP_VERSION:-staging}

      REQUIRE_DATABASE: ${REQUIRE_DATABASE:-true}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}

      WALLET_BASE_URL: ${WALLET_BASE_URL:-https://wallet.staging.example.com}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-https://gateway.staging.example.com,https://wallet.staging.example.com,https://issuer.staging.example.com,https://recruiter.staging.example.com}

      # Optional integrations
      DID_ENCRYPTION_KEY: ${DID_ENCRYPTION_KEY:-}
      WALLET_ENCRYPTION_KEY: ${WALLET_ENCRYPTION_KEY:-}
      POSTHOG_API_KEY: ${POSTHOG_API_KEY:-}
      POSTHOG_HOST: ${POSTHOG_HOST:-https://app.posthog.com}
      SENTRY_DSN: ${WALLET_SENTRY_DSN:-}
      LOG_LEVEL: ${LOG_LEVEL:-info}

  issuer:
    image: ghcr.io/credity/credverse-issuer:staging
    restart: unless-stopped
    ports:
      - "5001:5001"
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 5001
      APP_NAME: credverse-issuer
      APP_VERSION: ${APP_VERSION:-staging}

      REQUIRE_DATABASE: ${REQUIRE_DATABASE:-true}
      REQUIRE_QUEUE: ${REQUIRE_QUEUE:-true}
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}

      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      ISSUER_KEY_ENCRYPTION: ${ISSUER_KEY_ENCRYPTION}
      ISSUER_KEY_ENCRYPTION_PREVIOUS: ${ISSUER_KEY_ENCRYPTION_PREVIOUS:-}

      APP_URL: ${ISSUER_APP_URL:-https://issuer.staging.example.com}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-https://gateway.staging.example.com,https://wallet.staging.example.com,https://issuer.staging.example.com,https://recruiter.staging.example.com}

      # Chain/anchoring settings
      BLOCKCHAIN_ANCHOR_MODE: ${BLOCKCHAIN_ANCHOR_MODE:-async}
      CHAIN_NETWORK: ${CHAIN_NETWORK:-ethereum-sepolia}
      REGISTRY_CONTRACT_ADDRESS: ${REGISTRY_CONTRACT_ADDRESS:-}
      RELAYER_PRIVATE_KEY: ${RELAYER_PRIVATE_KEY:-}
      RPC_URL: ${RPC_URL:-}
      SEPOLIA_RPC_URL: ${SEPOLIA_RPC_URL:-}

      # Optional integrations
      RESEND_API_KEY: ${RESEND_API_KEY:-}
      EMAIL_FROM: ${EMAIL_FROM:-CredVerse <noreply@staging.example.com>}
      PINATA_JWT: ${PINATA_JWT:-}
      PINATA_GATEWAY: ${PINATA_GATEWAY:-gateway.pinata.cloud}
      POSTHOG_API_KEY: ${POSTHOG_API_KEY:-}
      POSTHOG_HOST: ${POSTHOG_HOST:-https://app.posthog.com}
      SENTRY_DSN: ${ISSUER_SENTRY_DSN:-}
      LOG_LEVEL: ${LOG_LEVEL:-info}

  recruiter:
    image: ghcr.io/credity/credverse-recruiter:staging
    restart: unless-stopped
    ports:
      - "5003:5003"
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 5003
      APP_NAME: credverse-recruiter
      APP_VERSION: ${APP_VERSION:-staging}

      REQUIRE_DATABASE: ${REQUIRE_DATABASE:-true}
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}

      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-https://gateway.staging.example.com,https://wallet.staging.example.com,https://issuer.staging.example.com,https://recruiter.staging.example.com}
      WALLET_ENDPOINT: ${WALLET_ENDPOINT:-http://wallet:5002}
      ISSUER_REGISTRY_URL: ${ISSUER_REGISTRY_URL:-http://issuer:5001}

      VERIFICATION_WEBHOOK_URL: ${VERIFICATION_WEBHOOK_URL:-}
      VERIFICATION_WEBHOOK_SECRET: ${VERIFICATION_WEBHOOK_SECRET:-}
      CREDENTIAL_WEBHOOK_SECRET: ${CREDENTIAL_WEBHOOK_SECRET:-}

      POSTHOG_API_KEY: ${POSTHOG_API_KEY:-}
      POSTHOG_HOST: ${POSTHOG_HOST:-https://app.posthog.com}
      SENTRY_DSN: ${RECRUITER_SENTRY_DSN:-}
      LOG_LEVEL: ${LOG_LEVEL:-info}

  # Optional local backing services for staging-in-a-box (disable if managed services are used)
  # Start with: docker compose --profile local-deps up -d
  postgres:
    profiles: ["local-deps"]
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-credity}
      POSTGRES_USER: ${POSTGRES_USER:-credity}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-change-me}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    profiles: ["local-deps"]
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

---

## 2) `.env.staging.template` (safe placeholders only)

```dotenv
# Core
NODE_ENV=production
APP_VERSION=staging
LOG_LEVEL=info

# Shared strict runtime
REQUIRE_DATABASE=true
REQUIRE_QUEUE=true

# Shared auth (set real secrets in secret manager, not in git)
JWT_SECRET=replace-with-64-char-random-hex
JWT_REFRESH_SECRET=replace-with-64-char-random-hex

# Shared infra
DATABASE_URL=postgresql://credity:change-me@postgres:5432/credity
REDIS_URL=redis://redis:6379/0

# Public app URLs
GATEWAY_URL=https://gateway.staging.example.com
ISSUER_APP_URL=https://issuer.staging.example.com
WALLET_BASE_URL=https://wallet.staging.example.com
RECRUITER_URL=https://recruiter.staging.example.com

# CORS (comma-separated)
ALLOWED_ORIGINS=https://gateway.staging.example.com,https://wallet.staging.example.com,https://issuer.staging.example.com,https://recruiter.staging.example.com

# Gateway wiring
WALLET_API_URL=http://wallet:5002
ISSUER_API_URL=http://issuer:5001
RECRUITER_API_URL=http://recruiter:5003
VITE_WALLET_URL=https://wallet.staging.example.com
VITE_ISSUER_URL=https://issuer.staging.example.com
VITE_RECRUITER_URL=https://recruiter.staging.example.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://gateway.staging.example.com/api/auth/google/callback

# Issuer-required crypto/queue
ISSUER_KEY_ENCRYPTION=replace-with-64-char-hex
ISSUER_KEY_ENCRYPTION_PREVIOUS=
BLOCKCHAIN_ANCHOR_MODE=async
CHAIN_NETWORK=ethereum-sepolia
REGISTRY_CONTRACT_ADDRESS=
RELAYER_PRIVATE_KEY=
RPC_URL=
SEPOLIA_RPC_URL=

# Optional integration keys
RESEND_API_KEY=
EMAIL_FROM=CredVerse <noreply@staging.example.com>
PINATA_JWT=
PINATA_GATEWAY=gateway.pinata.cloud
POSTHOG_API_KEY=
POSTHOG_HOST=https://app.posthog.com

# Recruiter integration
WALLET_ENDPOINT=http://wallet:5002
ISSUER_REGISTRY_URL=http://issuer:5001
VERIFICATION_WEBHOOK_URL=
VERIFICATION_WEBHOOK_SECRET=
CREDENTIAL_WEBHOOK_SECRET=

# Per-service telemetry DSNs
GATEWAY_SENTRY_DSN=
WALLET_SENTRY_DSN=
ISSUER_SENTRY_DSN=
RECRUITER_SENTRY_DSN=

# Optional local-deps profile only
POSTGRES_DB=credity
POSTGRES_USER=credity
POSTGRES_PASSWORD=change-me
```

---

## 3) Startup and readiness notes

1. **Prepare env file**
   - Copy template to `.env.staging`.
   - Fill secrets from secret manager (do not commit).

2. **Boot**
   - Managed DB/Redis: `docker compose --env-file .env.staging -f docker-compose.staging.yml up -d`
   - Local deps too: `docker compose --profile local-deps --env-file .env.staging -f docker-compose.staging.yml up -d`

3. **Readiness checks**
   - Gateway: `curl -fsS http://localhost:5173/api/health`
   - Issuer: `curl -fsS http://localhost:5001/api/health`
   - Wallet: `curl -fsS http://localhost:5002/api/health`
   - Recruiter: `curl -fsS http://localhost:5003/api/health`

4. **Cross-service smoke checks**
   - Gateway auth status: `curl -fsS http://localhost:5173/api/auth/status`
   - Gateway mobile proxy -> issuer bitstring route (requires issuer up):
     `curl -i http://localhost:5173/api/mobile-proxy/issuer/v1/status/bitstring/test`

5. **Expected startup behavior**
   - With `REQUIRE_DATABASE=true`, services fail-fast if `DATABASE_URL` missing.
   - Issuer with `REQUIRE_QUEUE=true` fails-fast if `REDIS_URL` missing.
   - Missing optional integrations (Sentry/PostHog/Pinata/Resend) should degrade gracefully.

## 4) Implementation notes for platform team

- No Dockerfiles were found in repo roots for these services; template assumes prebuilt images (`ghcr.io/credity/...:staging`).
- If running from source in Compose, add service-specific Dockerfiles (or one parametrized Dockerfile) and replace `image:` with `build:` blocks.
- Keep `JWT_SECRET` and `JWT_REFRESH_SECRET` shared across services to preserve SSO behavior.
