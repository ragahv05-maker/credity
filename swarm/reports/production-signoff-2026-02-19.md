# Credity Production Sign-off — 2026-02-19 (IST)

## Executive status
- **Platform state:** LIVE and stable for core API availability.
- **Gateway state:** Cutover complete in serverless proxy mode.
- **Infra state:** Railway services healthy.
- **Readiness:** **Conditional GO** (see open items for full deep-functional close).

## Live endpoints
- Gateway: `https://credverse-gateway.vercel.app`
- Issuer: `https://issuer-api-production.up.railway.app`
- Wallet: `https://wallet-api-production-b38d.up.railway.app`
- Recruiter: `https://recruiter-api-production-2397.up.railway.app`

## Health and routing validation (PASS)
- `GET /api/health` via gateway ✅
- `GET /api/mobile/issuer/api/health` via gateway ✅
- `GET /api/mobile/wallet/api/health` via gateway ✅
- `GET /api/mobile/recruiter/api/health` via gateway ✅

## Functional smoke (current pass set)
- Wallet auth register via gateway proxy ✅
- Issuer status list fetch via gateway proxy ✅
- Issuer health includes queue availability payload ✅

## Quality and launch gates
- `npm run gate:launch` ✅ PASS
- `npm run ci:evidence:pack` ✅ PASS (artifact scaffold generated)
- `npm run perf:baseline` ✅ executed (results generated at `swarm/reports/data/credity-s22-perf-baseline.json`)

## Hardening posture (runtime vars)
- `ALLOW_DEMO_ROUTES=false` on issuer/wallet/recruiter ✅
- `REQUIRE_DATABASE=true` on issuer/wallet/recruiter ✅
- `REQUIRE_QUEUE=true` on issuer ✅
- `REQUIRE_QUEUE=false` on wallet/recruiter (current config)
- `SKIP_CLIENT_BUILD=true` for service deploy stability ✅

## Open items before “best-in-class +3” claim
1. **Issuer deep issuance flow auth key not in operator playbook**
   - Full OID4VCI issue/revoke e2e requires issuer API key path alignment.
   - Current endpoint rejects `test-api-key` (401 Invalid API Key), which is correct hardening behavior.
2. **Recruiter direct public DNS intermittency from this node resolver**
   - Direct domain occasionally failed DNS resolution from local shell.
   - Gateway-mediated path remained healthy and returned recruiter responses.
3. **Rate-limit threshold reached during repeated auth smoke**
   - Recruiter auth register hit per-IP limiter; expected protective behavior.

## Rollback references
- Vercel inspect URL (latest successful alias):
  - `https://vercel.com/raghavs-projects-33c7ffe1/credverse-gateway/H1Sn75fy5SuFmm6ZWi3WAvfUnnuH`
- Railway project:
  - `credity-production` (`52eb5d9a-c265-4a8c-b464-d1c4b78249d9`)
- Service status at sign-off time:
  - Postgres ✅, Redis ✅, issuer-api ✅, wallet-api ✅, recruiter-api ✅

## Conclusion
- We have completed infrastructure recovery, gateway cutover, runtime hardening, and live health/proxy validation.
- Remaining work is **deep-functional credential issuance/revocation verification under the production issuer key** and a final DNS consistency check from multiple networks.
- Operationally this is in a strong production state; with the 2 final checks closed, this can be marked full GO.
