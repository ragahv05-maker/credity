# Credity S28 — GO/NO-GO Release Board

_Last updated: 2026-02-15 (Asia/Calcutta)_

## Release Decision Rule

**GO** only if all conditions are true:
1. All **P0** rows are `🟩 DONE`.
2. `npm run check` passes at root and affected services.
3. `npm test` passes at root and affected services.
4. `npm run gate:launch:strict` passes with launch env loaded.
5. Foundation flow gate passes (`npm run gate:foundation` or `npm run gate:foundation:local`).
6. No open High/Critical security issues in release scope.

If any P0 is not done, decision is **NO-GO**.

## Current Decision Snapshot

- **Decision:** ❌ **NO-GO**
- **Reason:** Root check/test/strict-launch pass locally, but foundation gate currently fails (`nonce mismatch`) and hosted launch/contract CI evidence is not yet refreshed on the current release SHA.

---

## P0 Board (Release Blockers)

| ID | Item | Owner | Exit Criteria (must be true) | Current Status | Evidence / Notes |
|---|---|---|---|---|---|
| P0-01 | Recruiter verification route parse/runtime integrity | `@owner-recruiter` | `CredVerseRecruiter/server/routes/verification.ts` has no syntax/runtime import errors; recruiter tests run cleanly | 🟩 DONE | Revalidated on current head: `cd CredVerseRecruiter && npm test` passed (9 files passed, 1 smoke file skipped by default). |
| P0-02 | Recruiter full-suite deterministic pass | `@owner-recruiter` | `cd "CredVerseRecruiter" && npm test` exits 0 with no flaky failures | 🟩 DONE | Determinism restored by gating Sepolia smoke behind `RUN_SEPOLIA_SMOKE=true`; default suite now stable and green. |
| P0-03 | Cross-service quality gates pass | `@owner-release` | Root: `npm run check`, `npm test`, `npm run gate:launch:strict`, and foundation gate pass | 🟨 BLOCKED | Local runs on `ddd8b70` passed for `check`/`test`/`gate:launch:strict`, but `npm run gate:foundation:local` failed with `POST /api/v1/oid4vp/responses failed (400): {"error":"nonce mismatch"}`. Logs: `swarm/reports/logs/20260215-032831-*.log`. |
| P0-04 | CI release workflow validation on GitHub Actions | `@owner-devops` | Quality + launch + contract workflows green on release SHA | 🟧 PARTIAL | Latest green runs verified: quality `22024661938`, launch `22022372832`, contract `22022153594`. Launch/contract runs are on older SHAs; need fresh workflow_dispatch evidence for current release SHA. |
| P0-05 | Security high/critical sweep (runtime deps + contracts) | `@owner-security` | `npm audit --omit=dev --audit-level=high` clean for impacted modules + contract static analysis green | 🟩 DONE | `npm audit --omit=dev --audit-level=high` returned `found 0 vulnerabilities`; contract static analysis green via `test:contracts` (`solhint`, `hardhat compile`, `hardhat test`). |

---

## Sepolia Deployment & Smoke Evidence (Current Head)

- Active contract (approved wallet deployment): `0x6060250FC92538571adde5c66803F8Cbe77145a1`
- Deprecated contract (do not use): `0xee826d698997a84Df9f4223Df7F57B9447EeacC4`
- Smoke command: `cd CredVerseRecruiter && RUN_SEPOLIA_SMOKE=true ... npm run test:sepolia-smoke`
- Smoke result: ✅ pass (`anchors on-chain and verifies proof path`)
- Latest anchored tx captured in smoke log: `0xe629bc09e2ab6891559b7205b6a66e9e63b31640824814366a0dfb0734972c46`
- Explorer: https://sepolia.etherscan.io/tx/0xe629bc09e2ab6891559b7205b6a66e9e63b31640824814366a0dfb0734972c46

---

## P1 Board (Ship-Ready but Not Hard Blockers)

| ID | Item | Owner | Exit Criteria | Current Status | Evidence / Notes |
|---|---|---|---|---|---|
| P1-01 | OID4VP cryptographic binding hardening | `@owner-recruiter` | JWT signature + `aud` enforcement added for `vp_token`; tests expanded | 🟧 TODO | S12 delivered nonce/state binding; cryptographic verification listed as follow-up. |
| P1-02 | Key management persistence beyond in-memory rotation hooks | `@owner-issuer-security` | Persisted key versioning + external secret manager/HSM plan approved | 🟧 TODO | S18 adds runtime hooks but notes in-memory architectural limitation. |
| P1-03 | ZK backend adapter path (beyond deterministic contract stub) | `@owner-zk` | Adapter registry + first real backend integrated behind current proof contract | 🟧 TODO | S13 establishes deterministic executable contract path; real proving backend is next step. |
| P1-04 | Performance baseline SLO sign-off | `@owner-platform` | `npm run perf:baseline` run against release env; p95 thresholds documented and accepted | 🟧 TODO | S22 shipped harness; no release-env baseline sign-off artifact attached yet. |
| P1-05 | API contract publication + consumer sign-off | `@owner-api` | S19 snapshots promoted to versioned artifact and reviewed by consumers | 🟧 TODO | S19 produced snapshots; promotion/sign-off step pending. |

---

## Current Status Auto-Fill Instructions

Use this workflow to auto-refresh the **Current Status** column before every release decision:

1. **Set status tokens (strict):**
   - `🟩 DONE` = exit criteria met + evidence link/log attached
   - `🟧 PARTIAL` = partial implementation or targeted pass only
   - `🟥 OPEN` = not completed / no evidence
   - `🟨 BLOCKED` = cannot proceed due to explicit blocker

2. **Collect latest evidence from swarm reports:**
   ```bash
   cd /Users/raghav/Desktop/credity
   ls -1 swarm/reports/credity-s*.md
   rg -n "PASS|FAIL|blocked|Unexpected|not completed|TODO|follow-up|pending" swarm/reports/credity-s*.md
   ```

3. **Run release gate commands and capture outputs (required for P0-03/P0-05):**
   ```bash
   cd /Users/raghav/Desktop/credity
   npm run check
   npm test
   npm run gate:launch:strict
   # security gate (per module as needed)
   npm audit --omit=dev --audit-level=high
   ```

4. **Auto-fill rule per row:**
   - If command/test in exit criteria passed on current release commit and evidence exists → `🟩 DONE`
   - If some sub-criteria pass but not all → `🟧 PARTIAL`
   - If evidence shows explicit blocker/error (syntax error, failing suite, missing env, infra unavailable) → `🟨 BLOCKED`
   - Otherwise → `🟥 OPEN`

5. **Decision refresh:**
   - If any P0 != `🟩 DONE` → set top decision to **❌ NO-GO**
   - If all P0 are `🟩 DONE` → set top decision to **✅ GO**

---

## Evidence Bundle (recommended attach list)

- Release commit SHA
- Root gate logs: `check`, `test`, `gate:launch:strict`
- CI workflow URL for green run
- Security scan outputs (audit + contract static analysis)
- Any approved risk waivers for remaining P1 items
