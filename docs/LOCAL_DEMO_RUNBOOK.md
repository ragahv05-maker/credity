# Local Full-Product Demo (One Command)

## Prereqs
- Node.js >= 20 (repo currently uses Node v22)
- Ports free: `5001` (issuer), `5002` (wallet), `5003` (recruiter), `5173` (gateway)

## Run
From repo root:

```bash
cd /Users/raghav/Desktop/credity
npm run demo:local
```

What it does:
- Ensures dependencies are installed for each service (runs `npm install` if `node_modules/` missing)
- Starts services on fixed ports
- Waits for `/api/health` on each
- Runs `scripts/foundation-e2e-gate.mjs` once to seed a deterministic happy-path
- Keeps all services running until you press **Ctrl+C**

## URLs
- Gateway: http://localhost:5173
- Issuer: http://localhost:5001
- Wallet: http://localhost:5002
- Recruiter: http://localhost:5003

## Claims Dashboard fix
Recruiter UI calls `GET /api/claims?...`.
Locally we proxy that route in Recruiter server (`server/routes/claims-proxy.ts`) to Wallet `GET /api/v1/claims`.

**Requirement:** Wallet must run with `ALLOW_DEMO_ROUTES=true` (the demo runner sets this by default).

## Troubleshooting
- If you see port-in-use errors: stop old processes and rerun.
- If the seed step fails but services are up: you can still demo UI navigation; rerun seed by itself:

```bash
cd /Users/raghav/Desktop/credity
node scripts/foundation-e2e-gate.mjs
```
