# Credity12 Production War-Room Plan (Parallel Lanes)

Date: 2026-02-20
Repo: /Users/raghav/Desktop/credity12
Primary objective: complete PRD productionization + verified live infra + cloud database migration readiness.

## Live status snapshot
- Gateway: https://credverse-gateway.vercel.app/api/health -> 200
- Issuer via gateway: /api/mobile/issuer/api/health -> 200
- Wallet via gateway: /api/mobile/wallet/api/health -> 200
- Recruiter via gateway: /api/mobile/recruiter/api/health -> 200
- Issuer direct Railway: https://issuer-api-production.up.railway.app/api/health -> 200
- Wallet direct Railway: https://wallet-api-production-b38d.up.railway.app/api/health -> 200
- Recruiter direct Railway: https://recruiter-api-production-2397.up.railway.app/api/health -> 200

## Parallel production team and lane charters

### Lane A — PRD Completion Cell
Owner: PRD Lead Agent
Goal: map PRD v2.0 requirements to code and close P0/P1 gaps with evidence.
Deliverables:
1. feature matrix PASS/PARTIAL/FAIL
2. missing endpoint/service/test list
3. acceptance criteria and validation commands per feature
4. prioritized implementation backlog

### Lane B — Infrastructure & Live Reliability Cell
Owner: SRE/Platform Agent
Goal: prove deployment readiness and rollback safety on current Vercel+Railway topology.
Deliverables:
1. environment/secret posture review
2. production health and synthetic checks
3. rollback and incident checklist
4. GO/NO-GO recommendation

### Lane C — Database Cloud Migration Cell
Owner: Data Platform Agent
Goal: migrate persistence to cloud DB (Supabase preferred) with minimal downtime.
Deliverables:
1. schema inventory + migration SQL order
2. dual-write/backfill/cutover plan
3. verification and rollback plan
4. runbook + env var contract

### Lane D — Release Program Cell
Owner: Release Manager Agent
Goal: timeline and coordination across all lanes.
Deliverables:
1. day-by-day plan (D0..D14)
2. critical path + dependency map
3. evidence gates for each milestone
4. final launch packet template

## Execution policy
- No DONE claims without command/log/file evidence.
- All lane outputs append to swarm/reports with timestamp.
- Merge order: security+infra first, then feature completion, then final release evidence.

## Immediate blocking inputs needed from human
1. Supabase project URL + service role key + DB password (or alternate cloud DB credentials)
2. Railway and Vercel project access tokens for final secret wiring and redeploy checks
3. Domain ownership/DNS access if production cutover changes are required

## Timeline targets
- T+2h: PRD gap matrix + infra audit + migration runbook drafts
- T+6h: first implementation batch merged (P0 security/infrastructure + auth gaps)
- T+12h: cloud DB migration dry-run in staging + production evidence refresh
- T+24h: final production readiness packet and GO/NO-GO
