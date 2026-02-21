# CredVerse - Railway Deployment

This is a monorepo with 4 services. Deploy each service separately on Railway.

## Quick Start

### 1. Create Services in Railway

For each service, create a new service from GitHub and set:

| Service   | Root Directory       |
| --------- | -------------------- |
| Issuer    | `CredVerseIssuer 3`  |
| Wallet    | `BlockWalletDigi`    |
| Recruiter | `CredVerseRecruiter` |
| Gateway   | `credverse-gateway`  |

### 2. Add Environment Variables

**Required for ALL services:**

```env
NODE_ENV=production
JWT_SECRET=<64-char-secret>
JWT_REFRESH_SECRET=<64-char-secret>
ALLOWED_ORIGINS=https://your-issuer.up.railway.app,https://your-wallet.up.railway.app,...
```

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Deploy

Railway auto-deploys on push. Each service has `railway.toml` pre-configured.

## Detailed Guide

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for:

- Complete environment variable reference
- Database setup
- Custom domains
- Monitoring setup
- Troubleshooting
