# Operational Memory — Current State (Ingest v1)

## Repo Ground Truth

- Path: /Users/raghav/Desktop/credity
- Branch: main
- Remote: origin https://github.com/ragahv05-maker/credity.git
- Recent commit head (at ingest): 6e21aff

## Project Topology

- Core services:
  - BlockWalletDigi (wallet)
  - CredVerseIssuer 3 (issuer + contracts)
  - CredVerseRecruiter (verifier/recruiter)
  - credverse-gateway (public portal)
  - apps/mobile (mobile wallet)
- Shared module: packages/shared-auth
- Strategic docs: information\_\_critical/ (PRD, Raghav_Badhwar master plan, CHANGES, etc.)

## What has been done so far (evidence-backed)

- Major gateway redesign + trust/conversion work landed in multiple recent commits.
- Recruiter AI anomaly copilot added (16f59f3).
- Issuer auth/rate-limit hardening and wallet user auth hardening landed (ddd8b70).
- QA and release evidence improvements landed (68bb4f2, 9ed8d40, 631c2e6).
- S32/S33/S34 planning and board artifacts are present under swarm/reports.

## Quality/Release Reality

- S28 board says current status remains NO-GO until all P0 gates are green.
- S31 indicates:
  - root check/test/launch strict: pass
  - foundation local gate: fail (nonce mismatch)
  - hosted launch/contract evidence freshness on release SHA still pending

## Known external blockers

- Production secrets and secret manager finalization
- Permanent hosting/domain/DNS credentials
- Final irreversible chain/wallet signing approvals

## Operational Checkpoint — 2026-02-16T19:50:26+05:30

- Active pods: Issuer Integration Pod, Consumer Hardening Pod, Recruiter Hardening Pod, AEOS Records Pod.
- Completed pods: Operating Model Lock Pod, Ingest v1 Memory Baseline Pod.
- Current quality status: Integration/Hardening wave active under L3+ evidence gates; NO-GO remains until all P0 gates are green and hosted release evidence is fresh.

## Operational Checkpoint — Shutdown Resilience Directive (2026-02-16T19:55:00+05:30)

- Owner directive: maintain durable records so progress can be resumed even after laptop shutdown/restart.
- Continuity protocol:
  - Keep AEOS Operational_Memory updated with current pod status, completed work, blockers, and next steps.
  - Keep Decision_Logs updated for key policy directives.
  - Keep workspace memory (`memory/YYYY-MM-DD.md`) updated with durable session directives.
- Non-negotiable engineering directive: prioritize root-cause fixes over superficial patches.

## Operational Checkpoint — Root Error Finder + Resilience DB (2026-02-16T20:00:00+05:30)

- Ran root-level error finder via full monorepo gates (`npm run check`, `npm test`): all passing.
- Root-cause hardening applied: added Vitest `setup-env.ts` in Wallet/Issuer/Recruiter and wired config `setupFiles` to remove fallback-secret test noise at source.
- Created shutdown-resilience database mirror at `AEOS_Memory/Operational_Memory/aeos_resilience.sqlite`.
- Added sync utility: `scripts/aeos_resilience_sync.py` + npm command `npm run aeos:sync-db`.
- Updated AEOS memory README with DB recovery instructions.

## Operational Checkpoint — Reputation/SafeDate execution push (2026-02-17T17:56:00+05:30)

- Issuer reputation-graph lane advanced from scaffold to enabled Neo4j path with route-level writes/snapshot surface.
- Wallet reputation summary lane integrated with `@credverse/trust` (trust-sdk live path) + deterministic local fallback.
- Wallet reputation route contracts hardened for mixed weight formats (0-1 and 0-100 normalization).
- New evidence tests added and passing:
  - `CredVerseIssuer 3/tests/reputation-graph*.test.ts`
  - `CredVerseIssuer 3/tests/reputation-route-graph.test.ts`
  - `BlockWalletDigi/tests/reputation-route-summary.test.ts`
- Targeted typecheck gates passing in both Issuer and Wallet slices.
