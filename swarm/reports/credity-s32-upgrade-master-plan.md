# Credity S32 — Full-Stack Upgrade Master Plan

_Last updated: 2026-02-15 (Asia/Calcutta)_

## 1) Objective (Recalibrated to strict standard)

Raise Credity from current ~5.9/10 to:

- **Tomorrow target (Ship-ready uplift): 7.0–7.4/10**
- **Next 5–7 days (Premium target): 8.0+/10**

Non-negotiables:

- No security compromise
- No fake completion
- Preserve W3C DID/VC + ZK-native direction

---

## 2) Current Baseline (strict reassessment)

- Website / brand / storytelling: **4.2**
- Wallet UX: **4.8**
- Credential claim/store/share: **6.4**
- Recruiter verification UX: **6.8**
- Issuer dashboard/issuance: **6.3**
- Blockchain anchor/revocation reliability: **6.9**
- Security posture (practical): **7.1**
- AI anomaly layer quality: **6.2**
- DevOps/production readiness: **5.7**
- Overall: **~5.9**

---

## 3) Upgrade Strategy (two horizons)

## Horizon A — 0 to 24h (what can be done immediately)

Goal: Ship-ready uplift without external credential dependency.

### A1. Website rescue (4.2 -> 7.2)

- Full narrative restructure:
  1. Clear ICP split hero (Institution vs Recruiter)
  2. Proof-first metrics with concrete evidence links
  3. How-it-works + trust architecture flow
  4. Outcome-led case proof blocks
  5. Strong CTA architecture
- Visual system hardening:
  - refined typography scale
  - spacing rhythm consistency
  - reduced section clutter
  - cleaner mobile composition
- Acceptance:
  - Lighthouse performance/accessibility pass thresholds documented
  - responsive QA complete on major breakpoints

### A2. Wallet UX reliability pass (4.8 -> 6.8)

- Remove friction in auth/session/claims flows
- Better loading/error/empty states
- Input validation + actionable error copy
- Acceptance:
  - no dead-end states in core happy paths
  - all primary flows produce deterministic user feedback

### A3. Recruiter + Issuer flow polish (6.3–6.8 -> 7.2)

- Verification report readability improvements
- Stronger result explanation blocks (risk + reason codes)
- Issuance form constraints and clarity upgrades
- Acceptance:
  - e2e issuer->wallet->recruiter path still green

### A4. Release gate hardening (5.7 -> 6.8)

- Ensure root checks/tests/gates are reproducibly green in local evidence
- Update release board + evidence pack on latest SHA
- Acceptance:
  - latest head has green hosted quality gate

---

## Horizon B — 5 to 7 days (premium 8+/10)

Goal: premium product quality and stronger market-facing polish.

### B1. Premium UX pass

- microinteractions and motion system consistency
- interaction latency tuning
- design token cleanup

### B2. Product depth pass

- richer verification intelligence views
- audit/export/report UX refinement
- issuer governance workflows polish

### B3. Security + ops completion

- production secret manager integration
- monitoring/alerts + incident runbook validation
- backup/restore drills

### B4. Deploy maturity

- stable domain + permanent hosting cutover
- post-deploy smoke suite and rollback rehearsal

---

## 4) Workstream Pods (parallel execution)

- **Pod F (Frontend Experience):** website + wallet + recruiter UI
- **Pod B (Backend Reliability):** auth, limits, API consistency, deterministic behavior
- **Pod Q (QA & Evidence):** test matrix, regression guards, release board evidence
- **Pod R (Release/DevOps):** deploy docs, env templates, CI status, launch packet

---

## 5) Truth-in-Execution Constraints

Cannot be fully completed without external inputs:

1. final production secrets
2. final hosting account/domain credentials
3. final on-chain production wallet/signing approvals (if target chain cutover required)

Plan: pre-stage everything else, keep these as explicit unblockers.

---

## 6) Decision Gates

### Gate G1 (today)

- core user flows stable
- latest quality-gates CI green
- release evidence refreshed

### Gate G2 (tomorrow)

- launch strict with production-like env passes
- deployment runbook final
- blocker list reduced to only user-credential items

### Gate G3 (premium target)

- UX quality benchmark >= 8/10
- reliability/security/ops signoff evidence complete

---

## 7) Next 6-hour execution sequence

1. Website overhaul pass (layout/copy/visual hierarchy)
2. Wallet + recruiter UX consistency pass
3. Issuer interaction polish + validation cleanup
4. Test/check/build sweep on impacted services
5. Push, verify CI, update evidence docs
6. Handoff with before/after quality scoring and blocker ledger
