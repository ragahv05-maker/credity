# GO DEMO Checklist (Local) — Credity

Date: 2026-02-16 (IST)
Branch: `integration/demo-2026-02-16`

## 0) Preconditions
- Node.js installed (repo expects modern Node; see `.nvmrc` if present).
- From repo root:
  - `npm install`

## 1) Root gates (must be green)
Run from repo root:

```bash
cd /Users/raghav/Desktop/credity
npm run check
npm test
npm run demo:local
```

Expected:
- `npm run check` exits 0
- `npm test` exits 0
- `npm run demo:local` starts services and completes (or at least reaches steady state) without fatal errors

## 2) Demo smoke: service reachability
When `npm run demo:local` is running, verify:

- Gateway: http://localhost:5173
- Issuer: http://localhost:5001 (health: http://localhost:5001/api/health)
- Wallet: http://localhost:5002 (health: http://localhost:5002/api/health)
- Recruiter: http://localhost:5003 (health: http://localhost:5003/api/health)

## 3) Demo walkthrough (happy path)
1. Open Gateway (5173) and confirm landing loads.
2. Open Issuer (5001) and confirm issuance screen loads without errors.
3. Open Wallet (5002) and confirm claims/credentials views load.
4. Open Recruiter (5003):
   - Instant Verify: verify a VC/JWT and confirm result renders (status + risk/fraud panels).
   - Bulk Verify: upload CSV and confirm table populates + summary stats.
   - Claims Dashboard: confirm stats + recent claims render.

## 4) Key API contracts (spot-check)
From another terminal (while demo is running):

```bash
curl -sS http://localhost:5003/api/health | head
curl -sS "http://localhost:5003/api/claims?period=today&limit=50" | head
```

If Claims dashboard is empty:
- Ensure wallet demo routes are enabled (e.g. `ALLOW_DEMO_ROUTES=true`).
- Hit wallet directly:

```bash
curl -sS "http://localhost:5002/api/v1/claims?limit=20&offset=0" | head
```

## 5) GO / NO-GO decision
GO when:
- All 3 root gates are green (Section 1)
- All 4 services are reachable (Section 2)
- Recruiter Instant Verify + Bulk Verify + Claims dashboard render successfully (Section 3)

NO-GO when:
- Any root gate fails OR services don’t start reliably OR recruiter flows are broken.
