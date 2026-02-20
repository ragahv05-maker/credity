# CredVerse Production Deployment Guide

This guide covers deploying the CredVerse ecosystem to Railway (recommended) or other platforms.

## ☁️ GCP Deployment Baseline (Cloud Run + Cloud SQL, Mumbai)

This repo now includes a production baseline under `infra/gcp` targeting `asia-south1`:

- `infra/gcp/cloudrun/services.yaml`
- `infra/gcp/cloudrun/env.example.yaml`
- `infra/gcp/README.md`

Recommended production controls:

- `REQUIRE_DATABASE=true`
- `REQUIRE_QUEUE=true`
- `ALLOW_DEMO_ROUTES=false`
- `BLOCKCHAIN_ANCHOR_MODE=async`

Use Secret Manager for all secrets and connect Cloud Run services to Cloud SQL (PostgreSQL regional HA) and Memorystore (Redis).

## 🧪 Sepolia Registry Contract (Current + Deprecated)

- **Current active Sepolia registry (deployer-approved wallet):**
  - `0x6060250FC92538571adde5c66803F8Cbe77145a1`
  - https://sepolia.etherscan.io/address/0x6060250FC92538571adde5c66803F8Cbe77145a1
- **Deprecated (do not use for new integrations):**
  - `0xee826d698997a84Df9f4223Df7F57B9447EeacC4`
  - https://sepolia.etherscan.io/address/0xee826d698997a84Df9f4223Df7F57B9447EeacC4

Use only the current active contract for issuer/wallet/recruiter testnet wiring and smoke tests.

## 🏗️ Architecture Overview

CredVerse is a monorepo with 4 services:

| Service | Description | Port | Health Endpoint |
|---------|-------------|------|-----------------|
| **CredVerse Issuer** | University/Institution dashboard for issuing credentials | 5001 | `/api/health` |
| **BlockWallet** | Student digital wallet for managing credentials | 5002 | `/api/health` |
| **CredVerse Recruiter** | Employer portal for verifying credentials | 5003 | `/api/health` |
| **CredVerse Gateway** | Landing page & OAuth authentication | 5173 | `/api/health` |

## 📋 Prerequisites

1. Railway account at https://railway.app
2. GitHub repository (already connected)
3. Environment variables configured (see below)

## 🚀 Permanent Hosting Blueprint (Vercel + Railway)

Recommended split for stable production hosting:

- **Vercel:** `credverse-gateway` (edge/static + server routes)
- **Railway:** `CredVerseIssuer 3`, `BlockWalletDigi`, `CredVerseRecruiter` (long-running APIs)
- **Managed data/services:** PostgreSQL + Redis + Sentry (or equivalent)

### Secret-safe setup rules (must follow)

- Never paste real keys/tokens into docs, PRs, screenshots, or commit history.
- Keep all production secrets in provider secret managers (Vercel/Railway project envs).
- Use `.env.launch.example` as the placeholder checklist only.
- Validate presence with `npm run gate:launch:strict` after loading non-git local env.

### Vercel (Gateway)

1. Import this repo in Vercel.
2. Set Root Directory to `credverse-gateway`.
3. Configure environment variables in Vercel UI (Production + Preview):
   - `NODE_ENV=production`
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`
   - `ALLOWED_ORIGINS`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
   - `GATEWAY_SENTRY_DSN` (or `SENTRY_DSN`)
4. Point custom domain (e.g., `gateway.credity.in`) and verify HTTPS.

### Railway (Issuer / Wallet / Recruiter)

1. Create three services from this monorepo with roots:
   - `CredVerseIssuer 3`
   - `BlockWalletDigi`
   - `CredVerseRecruiter`
2. Configure shared env keys for all API services:
   - `NODE_ENV=production`
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`
   - `ALLOWED_ORIGINS`
   - `DATABASE_URL`
   - `REDIS_URL`
3. Configure Issuer-specific keys:
   - `ISSUER_KEY_ENCRYPTION` (+ optional `ISSUER_KEY_ENCRYPTION_PREVIOUS`)
   - `RELAYER_PRIVATE_KEY`
   - `REGISTRY_CONTRACT_ADDRESS`
   - `SENTRY_DSN`
4. Enforce hardening flags:
   - `ALLOW_DEMO_ROUTES=false`
   - `REQUIRE_DATABASE=true`
   - `REQUIRE_QUEUE=true`

### Post-deploy verification (no secret exposure)

```bash
# Health checks
curl https://issuer.<domain>/api/health
curl https://wallet.<domain>/api/health
curl https://recruiter.<domain>/api/health
curl https://gateway.<domain>/api/health

# Launch docs/config + required runtime vars (loaded locally, not committed)
set -a; source .env.launch.local; set +a
npm run gate:launch:strict
```

## 🚀 Deploy to Railway

### Step 1: Create Project

1. Go to https://railway.app/new
2. Select **"Deploy from GitHub repo"**
3. Choose your `raghavbadhwar/credity` repository

### Step 2: Deploy Each Service

Since this is a monorepo, you need to deploy each service separately:

#### Deploy Issuer Service
1. Click **"New Service"** → **"GitHub Repo"** → Select `credity`
2. Go to **Settings** → **Source**
3. Set **Root Directory** to: `CredVerseIssuer 3`
4. Click **Deploy**

#### Deploy Wallet Service
1. Click **"New Service"** → **"GitHub Repo"** → Select `credity`
2. Set **Root Directory** to: `BlockWalletDigi`
3. Click **Deploy**

#### Deploy Recruiter Service
1. Click **"New Service"** → **"GitHub Repo"** → Select `credity`
2. Set **Root Directory** to: `CredVerseRecruiter`
3. Click **Deploy**

#### Deploy Gateway Service
1. Click **"New Service"** → **"GitHub Repo"** → Select `credity`
2. Set **Root Directory** to: `credverse-gateway`
3. Click **Deploy**

### Step 3: Configure Environment Variables

For each service, add these environment variables in Railway:

#### Required for ALL Services
```env
NODE_ENV=production
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
ALLOWED_ORIGINS=https://issuer.yourdomain.com,https://wallet.yourdomain.com,https://recruiter.yourdomain.com,https://gateway.yourdomain.com
```

Generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Issuer Service (Additional)
```env
ISSUER_KEY_ENCRYPTION=<64-char-hex-key>
# Optional key-rotation support (keep previous keys temporarily while rotating):
ISSUER_KEY_ENCRYPTION_PREVIOUS=<old-64-char-hex-key>[,<older-64-char-hex-key>]
# Optional:
CHAIN_NETWORK=ethereum-sepolia
ENABLE_ZKEVM_MAINNET=false
CHAIN_RPC_URL=
RPC_URL=  # Optional backward-compatible override
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_ZKEVM_CARDONA_RPC_URL=https://rpc.cardona.zkevm-rpc.com
POLYGON_ZKEVM_RPC_URL=https://zkevm-rpc.com
DEPLOYER_PRIVATE_KEY=0x...
RELAYER_PRIVATE_KEY=0x...  # 32-byte hex with 0x prefix (required for on-chain writes)
REDIS_URL=redis://...  # For bulk issuance queue
RESEND_API_KEY=re_...  # For email notifications
SENTRY_DSN=https://...  # Error monitoring
```

`CHAIN_NETWORK` supported values:
- `ethereum-sepolia` (default, safest pilot)
- `polygon-mainnet`
- `polygon-amoy`
- `polygon-zkevm-cardona` (recommended zkEVM testnet path)
- `polygon-zkevm-mainnet` (enable only after cost and stability sign-off)

`ENABLE_ZKEVM_MAINNET` must be set to `true` before write operations (anchor/revoke) are allowed on `polygon-zkevm-mainnet`.

#### Gateway Service (Additional)
```env
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=https://gateway.yourdomain.com/api/auth/google/callback
```

### Step 4: Add Custom Domains (Optional)

1. Click on each service → **Settings** → **Networking**
2. Add custom domain (e.g., `issuer.credverse.io`)
3. Configure DNS:
   - Add CNAME record pointing to Railway domain
   - Wait for SSL certificate provisioning

### Step 5: Verify Deployment

Test each health endpoint:
```bash
curl https://issuer.yourdomain.com/api/health
curl https://wallet.yourdomain.com/api/health
curl https://recruiter.yourdomain.com/api/health
curl https://gateway.yourdomain.com/api/health
```

Each should return:
```json
{"status":"ok","app":"<service-name>"}
```

## 🔐 Security Checklist

Before going live, ensure:

- [x] **JWT Secrets**: Using strong, unique 64-character secrets
- [x] **HTTPS Only**: All production URLs use HTTPS
- [x] **CORS Configured**: Only your domains in `ALLOWED_ORIGINS`
- [x] **Rate Limiting**: Built-in API rate limiting active
- [x] **Helmet Headers**: Security headers enabled in production
- [x] **Error Monitoring**: Sentry DSN configured (optional but recommended)
- [x] **Database**: For production, configure PostgreSQL via `DATABASE_URL`

## 🗄️ Database Setup (Optional)

Currently CredVerse uses in-memory storage. For production persistence:

1. Add a PostgreSQL database in Railway
2. Copy the `DATABASE_URL` from Railway
3. Add to each service's environment variables
4. Run migrations: `npm run db:push`

## 📊 Monitoring

### Sentry Error Tracking
1. Create project at https://sentry.io
2. Add `SENTRY_DSN` to each service

### PostHog Analytics
1. Create project at https://posthog.com
2. Add `POSTHOG_API_KEY` to each service

## 🔄 CI/CD

Railway automatically deploys on push to main branch. Each service watches for changes in its root directory.

## 🧪 Testing Production Builds Locally

```bash
# Build all services
cd "CredVerseIssuer 3" && npm run build && cd ..
cd BlockWalletDigi && npm run build && cd ..
cd CredVerseRecruiter && npm run build && cd ..
cd credverse-gateway && npm run build && cd ..

# Test production start (in separate terminals)
cd "CredVerseIssuer 3" && npm run start
cd BlockWalletDigi && npm run start
cd CredVerseRecruiter && npm run start
cd credverse-gateway && npm run start
```

## 🆘 Troubleshooting

### Build Fails
- Check Railway build logs
- Ensure `packages/shared-auth` is built first (handled automatically)
- Verify all dependencies are in `package.json`

### Health Check Fails
- Wait 60 seconds for startup
- Check `healthcheckTimeout` in `railway.toml`
- Verify `PORT` environment variable is not overridden

### CORS Errors
- Update `ALLOWED_ORIGINS` with production domains
- Include both www and non-www versions

### API Not Working
- Check `NODE_ENV=production` is set
- Verify all required environment variables

## 📞 Support

- GitHub Issues: https://github.com/raghavbadhwar/credity/issues
- Documentation: Check `/docs` folder in repository

## 🇮🇳 DigiLocker Integration (India Identity)

DigiLocker lets Indian users pull government-issued documents (Aadhaar, PAN, driving licence, marksheets, etc.) directly into their CredVerse wallet. Both `BlockWalletDigi` and `CredVerseIssuer 3` include a DigiLocker pull service and will log a startup warning if `DIGILOCKER_CLIENT_ID` is unset.

### NHA Developer Portal Registration

1. Visit the **National Health Authority DigiLocker Partner Portal**: https://partners.digitallocker.gov.in
2. Create a partner account with your organisation's PAN and CIN.
3. Submit an application for **"Document Pull"** access (choose the document types required).
4. After approval, obtain:
   - `Client ID` → `DIGILOCKER_CLIENT_ID`
   - `Client Secret` → `DIGILOCKER_CLIENT_SECRET`
   - Allowed redirect URIs (register `https://<your-wallet-domain>/api/digilocker/callback`)

### Required Environment Variables

Add to each relevant service (`BlockWalletDigi`, `CredVerseIssuer 3`):

```env
# DigiLocker OAuth2 credentials (from NHA partner portal)
DIGILOCKER_CLIENT_ID=<client-id-from-nha>
DIGILOCKER_CLIENT_SECRET=<client-secret-from-nha>

# The redirect URI registered with NHA (must match exactly)
DIGILOCKER_REDIRECT_URI=https://<your-wallet-domain>/api/digilocker/callback

# Sandbox vs Production toggle
# Use "sandbox" during development — omit or set to "production" for live
DIGILOCKER_ENV=sandbox
```

### Sandbox vs Production

| | Sandbox | Production |
|---|---|---|
| Base URL | `https://digilocker.meripehchaan.gov.in` | `https://digilocker.meripehchaan.gov.in` |
| Client credentials | Test credentials from NHA portal | Live credentials from NHA portal |
| Documents returned | Mock/test documents only | Real government documents |
| Aadhaar OTP | Bypassed (fixed OTP accepted) | Live OTP via UIDAI |
| Rate limits | Relaxed | Enforced (see NHA SLA) |

Set `DIGILOCKER_ENV=sandbox` (or leave unset) during development. Switch to `DIGILOCKER_ENV=production` only after NHA production approval and IP whitelisting.

### IP Whitelisting

NHA requires all production API calls to originate from whitelisted egress IPs:

1. Identify your production server's **static outbound IP** (Railway: use a Static Outbound IP addon; GCP Cloud Run: use Cloud NAT with a reserved IP).
2. Submit the IP(s) to NHA via the partner portal under **"IP Whitelist Management"**.
3. Whitelisting propagates within 1–2 business days.
4. Test with: `curl -I https://digilocker.meripehchaan.gov.in` from your production server.

### Verification Checklist

- [ ] Partner account approved on NHA portal
- [ ] `DIGILOCKER_CLIENT_ID` and `DIGILOCKER_CLIENT_SECRET` set in deployment env
- [ ] Redirect URI registered and matches `DIGILOCKER_REDIRECT_URI` exactly
- [ ] Egress IP submitted to NHA and whitelisted
- [ ] `DIGILOCKER_ENV=production` set (do not leave as `sandbox` in production)
- [ ] No startup warning about missing `DIGILOCKER_CLIENT_ID` in server logs
