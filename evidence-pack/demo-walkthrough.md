# Full-Product Demo Walkthrough (Local)

**Goal:** Run the entire product locally in a deterministic, recruiter-facing demo mode.

## One-command start

```bash
cd /Users/raghav/Desktop/credity
npm run demo:local
```

This starts:
- Issuer (5001)
- Wallet (5002)
- Recruiter (5003)
- Gateway (5173)

…and runs the seed flow once (`scripts/foundation-e2e-gate.mjs`).

## Suggested live demo flow

1) **Open Gateway**: http://localhost:5173
   - Use as the “front door” (optional Google OAuth depending on env).

2) **Issuer dashboard**: http://localhost:5001
   - Show issuer health + readiness.

3) **Wallet**: http://localhost:5002
   - Show credential / claim engine pages (demo routes enabled).

4) **Recruiter portal**: http://localhost:5003
   - Navigate to **Claims Dashboard**.
   - Verify the dashboard loads and shows claim stats + recent claims.

## Known limitations (current)
- Demo data is seeded via a best-effort E2E script; if external dependencies (network, keys) are missing, the seed step can fail.
- Claims dashboard data comes from the wallet’s demo claims module and is proxied through recruiter.

## Fallback paths

### If seed step fails
Keep the services running and re-run the seed:

```bash
cd /Users/raghav/Desktop/credity
node scripts/foundation-e2e-gate.mjs
```

If seeding still fails, proceed with UI navigation + health endpoints:
- Issuer: http://localhost:5001/api/health
- Wallet: http://localhost:5002/api/health
- Recruiter: http://localhost:5003/api/health
- Gateway: http://localhost:5173/api/health

### If Claims Dashboard is empty
- Ensure wallet demo routes are enabled (`ALLOW_DEMO_ROUTES=true`).
- Hit wallet directly to confirm claims API:

```bash
curl "http://localhost:5002/api/v1/claims?limit=20&offset=0"
```

Recruiter’s endpoint:

```bash
curl "http://localhost:5003/api/claims?period=today&limit=100"
```

## Implementation notes
- Recruiter `/api/claims` is implemented in `CredVerseRecruiter/server/routes/claims-proxy.ts`.
- Upstream is wallet `GET /api/v1/claims` (wallet conditionally exposes it when `ALLOW_DEMO_ROUTES=true`).
