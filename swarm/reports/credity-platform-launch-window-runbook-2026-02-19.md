# Credity Platform/SRE Launch Runbook (12h Window)

**Date (IST):** 2026-02-19  
**Prepared by:** Platform/SRE lane  
**Objective:** Launch-safe operation for next 12h (no destructive actions)

---

## 1) Current Deployment Health Snapshot

### Live endpoints
- Gateway (Vercel): `https://credverse-gateway.vercel.app`
- Issuer API (Railway): `https://issuer-api-production.up.railway.app`
- Wallet API (Railway): `https://wallet-api-production-b38d.up.railway.app`
- Recruiter API (Railway): `https://recruiter-api-production-2397.up.railway.app`

### Health checks (gateway + direct): PASS
- `GET /api/health` on gateway ✅ 200
- `GET /api/mobile/issuer/api/health` via gateway ✅ 200
- `GET /api/mobile/wallet/api/health` via gateway ✅ 200
- `GET /api/mobile/recruiter/api/health` via gateway ✅ 200
- `GET /api/health` direct issuer ✅ 200
- `GET /api/health` direct wallet ✅ 200
- `GET /api/health` direct recruiter ✅ 200

### Repeated smoke latency sample (12 requests each): PASS
- gateway: 12/12 OK, p50 ~269ms, p95 ~344ms
- gateway->issuer: 12/12 OK, p50 ~277ms, p95 ~285ms
- issuer direct: 12/12 OK, p50 ~331ms, p95 ~366ms
- wallet direct: 12/12 OK, p50 ~310ms, p95 ~374ms
- recruiter direct: 12/12 OK, p50 ~332ms, p95 ~341ms

### DNS posture check: STABLE at check time
- `credverse-gateway.vercel.app` resolved consistently (2 IPs)
- Railway domains for issuer/wallet/recruiter resolved consistently (single IP each)

---

## 2) Provider Deploy Health

### Railway
- Project: `credity-production` (`52eb5d9a-c265-4a8c-b464-d1c4b78249d9`)
- Environment: `production`
- Service status from `railway status --json`: all active deployments `SUCCESS`
  - Postgres ✅
  - Redis ✅
  - issuer-api ✅
  - wallet-api ✅
  - recruiter-api ✅
- Latest deployment IDs observed:
  - issuer-api: `6b25859d-9966-4874-84a6-1f108dca0eed`
  - wallet-api: `e7c2f490-184a-4a74-9df0-5a2249626662`
  - recruiter-api: `28f21d14-3c86-49f6-bdeb-c3147223c02e`

### Vercel (gateway)
- Project: `raghavs-projects-33c7ffe1/credverse-gateway`
- Recent deploys include multiple `Ready` production deploys (latest observed ready: `credverse-gateway-fy4p7iw1h-...`)
- A few older production deploy attempts show `Error` state; latest active alias is healthy.

---

## 3) Environment Posture (Launch Gate)

### Strict gate result: PASS
Command executed with local launch env loaded:
- `npm run gate:launch:strict` ✅

Validated checks include:
- Runbooks present (incident + rollback)
- Launch gate doc present
- Distributed rate limit store set (`REDIS_URL`)
- Error tracking configured (`SENTRY_DSN` and/or `GATEWAY_SENTRY_DSN`)
- JWT secrets configured

### Hardening posture to preserve during launch
- `ALLOW_DEMO_ROUTES=false`
- `REQUIRE_DATABASE=true`
- `REQUIRE_QUEUE=true` (issuer)
- `NODE_ENV=production`
- Proper `ALLOWED_ORIGINS` scope only

---

## 4) Rollback Readiness

### Confirmed artifacts/refs for rollback
- Git revision at verification time: `cfed27f` on `main`
- Railway project and service deployment IDs captured (above)
- Vercel ready deployment history visible for quick promote/rollback
- Existing rollback runbook: `docs/runbooks/rollback.md`

### Rollback trigger policy (during 12h window)
Trigger rollback if any condition persists >10 minutes despite mitigation:
1. Any core service `/api/health` not returning 200
2. 5xx error-rate > 2% for 10 min on key routes
3. p95 latency > 1500ms for 10 min on key routes
4. Auth failures (401/403) spike > 3x baseline after release change
5. Queue unavailable / stalled growth with user-facing impact
6. Gateway proxy breakage (502/504 or auth callback failures)

### Rollback execution outline
1. Freeze new deploys
2. Revert gateway to last `Ready` Vercel deployment
3. Redeploy previous known-good Railway artifacts per impacted service
4. Re-run health + smoke matrix (section 6)
5. Hold 30-min stability watch before declaring recovered

---

## 5) 12h Operator Timeline (Canary + Monitoring)

###+ T-0 to T+30m (Canary phase)
- Route low internal traffic first (or internal operator flows)
- Check every 5 min:
  - Gateway + all direct `/api/health`
  - 5xx rate, p95 latency, auth success ratio
  - Queue availability (issuer)
- Canary GO if all green for 30 min

###+ T+30m to T+4h (Ramp phase)
- Increase traffic exposure in stages (25% → 50% → 100%)
- Check every 15 min:
  - Error budget burn rate
  - Response latency trend
  - Railway service restarts / crash loops
  - Vercel function errors

###+ T+4h to T+12h (Steady-state watch)
- Check every 30 min:
  - Health matrix
  - Incident dashboard / Sentry spikes
  - Queue backlog and dead-letter trend
  - DNS reachability from at least one secondary network if possible

---

## 6) Smoke Check Matrix (Run Through Gateway and Direct)

Run these commands during canary, after any mitigation, and before final sign-off:

```bash
# Gateway
curl -sS https://credverse-gateway.vercel.app/api/health
curl -sS https://credverse-gateway.vercel.app/api/mobile/issuer/api/health
curl -sS https://credverse-gateway.vercel.app/api/mobile/wallet/api/health
curl -sS https://credverse-gateway.vercel.app/api/mobile/recruiter/api/health

# Direct services
curl -sS https://issuer-api-production.up.railway.app/api/health
curl -sS https://wallet-api-production-b38d.up.railway.app/api/health
curl -sS https://recruiter-api-production-2397.up.railway.app/api/health
```

Expected: HTTP 200 + `status:"ok"` payloads.

---

## 7) Incident Handling During Launch Window

If any trigger fires:
1. Declare incident + assign Incident Commander
2. Freeze deploys
3. Classify (Auth / Queue / Blockchain / Gateway)
4. Follow `docs/runbooks/incident-response.md`
5. If unresolved within 10 min, execute rollback policy

---

## 8) Post-Launch (End of 12h) Checks

1. Confirm no Sev-1/Sev-2 open incidents
2. Export 12h summary:
   - uptime
   - p95 trends
   - total 5xx
   - auth success ratio
3. Confirm no queue backlog anomaly / DLQ growth
4. Record final deployment IDs + any mitigations performed
5. File post-launch sign-off note in `swarm/reports/`

---

## 9) Known Risks / Follow-ups

1. Deep issuance/revocation e2e still requires production issuer key-path operator validation.
2. Keep watch on recruiter direct DNS from secondary networks despite stable local resolver checks.
3. Some historic Vercel production deploys failed; latest active alias is healthy, but maintain rollback vigilance.

---

## 10) Fast Command Reference

```bash
# Railway health metadata
cd /Users/raghav/Desktop/credity
railway status --json

# Vercel deployment list (gateway)
cd /Users/raghav/Desktop/credity/credverse-gateway
vercel ls --yes

# Launch strict gate (with local env loaded)
cd /Users/raghav/Desktop/credity
set -a && source .env.launch.local && set +a
npm run gate:launch:strict
```
