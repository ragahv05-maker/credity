# Credity12 Production Parallel Execution Timeline (D0..D14)

**Repo:** `/Users/raghav/Desktop/credity12`  
**Date:** 2026-02-20 (IST)  
**Goal:** Production completion in 14 days with parallel agent execution, explicit dependencies, critical path control, and evidence-gated release.

---

## 1) Parallel Agent Lanes and Owners

| Lane | Owner | Mission | Primary Deliverables |
|---|---|---|---|
| **L1 Product/Program Control** | `@owner-release` | Day-wise orchestration, blockers, go/no-go calls | Daily standup log, dependency tracker, final go/no-go memo |
| **L2 Issuer Core + Chain** | `@owner-issuer` | Issuer stability, chain anchor/revocation reliability, key handling | Issuer green tests, chain-policy compliance, runtime hardening |
| **L3 Wallet + Holder Flows** | `@owner-wallet` | Claim/store/share reliability and proof-lifecycle compatibility | Wallet test harness fixed, claim/proof flows green |
| **L4 Recruiter Verification** | `@owner-recruiter` | Verifier determinism, OID4VP response hardening | Recruiter deterministic suite + OID4VP fixes |
| **L5 Security + Keys** | `@owner-security` | Secrets posture, audit closure, high/critical risk elimination | Audit evidence, secrets inventory, key rotation readiness |
| **L6 DevOps/Infra + Deploy** | `@owner-devops` | CI freshness, deploy pipelines, environment parity | Fresh launch/contract CI on release SHA, deploy runbooks |
| **L7 QA/E2E + Evidence** | `@owner-qa` | Cross-service validation + evidence pack assembly | E2E matrix pass, evidence bundle, release board updates |
| **L8 Observability/SRE** | `@owner-platform` | SLO baseline, alerting/runbook drill | Perf baseline, incident drill logs, rollback rehearsal |

---

## 2) Dependency Map (Execution-Critical)

### Hard dependencies
1. **Foundation gate fix (`nonce mismatch`)** → blocks final GO.
2. **Wallet test harness dependency repair (`supertest` gap)** → blocks full confidence on wallet lane.
3. **Fresh CI evidence on release SHA** (`launch-gate`, `contract-security-ci`) → blocks audit closure.
4. **Production secrets + env parity** (`gate:launch:strict`) → blocks production cutover.
5. **Cross-service E2E pass (Issuer→Wallet→Recruiter)** → blocks release signoff.

### Soft dependencies
- DigiLocker production approval/IP whitelist affects feature completeness (not core release if scoped behind flags).
- ZK backend depth beyond deterministic contract path is P1 unless explicitly promoted.

---

## 3) Critical Path (Must Not Slip)

**CP1 (Release viability path):**  
D0 scope freeze → D1-D3 foundation/OID4VP fix → D4 full root gates green → D5 fresh hosted CI evidence on release SHA → D6 cross-service E2E + security closure → D7 staging rehearsal green → D8 production cutover readiness → D9 go/no-go → D10 controlled release

If CP1 slips by >1 day, consume D11-D14 contingency; otherwise those days become stabilization/perf/ops hardening.

---

## 4) Day-by-Day Parallel Timeline (D0..D14)

| Day | L1 Program | L2 Issuer | L3 Wallet | L4 Recruiter | L5 Security | L6 DevOps | L7 QA/Evidence | L8 SRE/Obs | Gate |
|---|---|---|---|---|---|---|---|---|---|
| **D0** | Scope lock, backlog freeze, owners confirmed | Validate chain/network config baseline | Reproduce wallet failing suite | Reproduce foundation nonce mismatch | Security backlog triage | CI workflow map + release SHA target | Evidence template prepared | Monitoring checklist baseline | **G0 Plan Freeze** |
| **D1** | Daily risk board starts | Issuer policy/runtime fix batch A | Fix missing test deps/harness | OID4VP nonce/state patch design | Secrets inventory draft | Add workflow_dispatch/runbook notes | Start regression suite pass-1 | Alert rule inventory | — |
| **D2** | Dependency review | Issuer patch batch B + tests | Wallet proof lifecycle tests repaired | Recruiter patch batch A + tests | Audit dry run | Pipeline dry run (non-release) | E2E smoke pass-1 | Perf harness prep | — |
| **D3** | Blocker arbitration | Issuer hardening final for P0 | Wallet deterministic pass target | Recruiter deterministic pass target | High/Critical closure push | Staging env parity check | Cross-service E2E pass-2 | Logging/trace validation | **G1 P0 Engineering Complete** |
| **D4** | Readiness check | Support root gate failures | Support root gate failures | Support root gate failures | `npm audit` + contract checks | Root `check/test/gate:launch:strict` run | Collect logs + artifacts | SLO baseline run-1 | **G2 Local Gates Green** |
| **D5** | Evidence freshness review | Patch any release-SHA regressions | Same | Same | Security signoff v1 | Trigger hosted `launch-gate` + `contract-security-ci` on release SHA | Attach CI links to board | Error budget baseline | **G3 Hosted CI Fresh Green** |
| **D6** | Go/no-go pre-brief | Issuer + chain smoke | Wallet claim/share smoke | Recruiter verify smoke | Secrets final validation | Staging deploy candidate | Full Issuer→Wallet→Recruiter E2E + mismatch modes | Synthetic checks | **G4 Integrated E2E Green** |
| **D7** | Cutover plan publish | Issuer staging burn-in | Wallet staging burn-in | Recruiter staging burn-in | Key rotation rehearsal | Rollback rehearsal + runbook proof | Test report v1 | Incident drill #1 | **G5 Staging Rehearsal** |
| **D8** | Release committee prep | Final issuer config lock | Final wallet config lock | Final recruiter config lock | Final security waiver/none | Production infra preflight | Final release board update | Incident drill #2 | **G6 Production Readiness** |
| **D9** | Final GO/NO-GO meeting | Hotfix reserve | Hotfix reserve | Hotfix reserve | Final audit statement | Deployment window open | Evidence gate revalidation | SRE final checks | **G7 Go/No-Go** |
| **D10** | Controlled rollout supervision | Deploy + verify issuer | Deploy + verify wallet | Deploy + verify recruiter | Live security watch | Gateway + routing validation | Live smoke tests | Alert tuning | **G8 Release Executed** |
| **D11** | Post-release review #1 | Bugfixes P1/P2 | Bugfixes P1/P2 | Bugfixes P1/P2 | Threat monitoring | CI stabilization | Regression rerun | SLO check #2 | — |
| **D12** | Stakeholder update | Chain ops validation | UX issue closure | Verification UX closure | Compliance evidence polish | Backup/restore drill | Evidence pack freeze draft | Capacity review | — |
| **D13** | Exit readiness prep | Final issuer signoff | Final wallet signoff | Final recruiter signoff | Security closeout | Infra closeout | Final QA signoff | Ops closeout | **G9 Operational Signoff** |
| **D14** | Program close + retrospective | Handover docs | Handover docs | Handover docs | Risk register close | Release artifacts archive | Final production completion report | SRE handoff complete | **G10 Production Completion** |

---

## 5) Evidence Gates (Definition of Done by Stage)

| Gate | Required Evidence | Owner |
|---|---|---|
| **G0 Plan Freeze** | Final board with lane owners, scope tags (P0/P1), risk register initialized | `@owner-release` |
| **G1 P0 Engineering Complete** | PRs merged for foundation fix + wallet harness + recruiter deterministic pass | `@owner-issuer`, `@owner-wallet`, `@owner-recruiter` |
| **G2 Local Gates Green** | Logs for `npm run check`, `npm test`, `npm run gate:launch:strict`, foundation gate success | `@owner-qa` |
| **G3 Hosted CI Fresh Green** | GitHub Actions links (quality/launch/contract) on **current release SHA** | `@owner-devops` |
| **G4 Integrated E2E Green** | Cross-service E2E report incl. mismatch/deferred behavior assertions | `@owner-qa` |
| **G5 Staging Rehearsal** | Staging smoke, rollback rehearsal log, runbook execution evidence | `@owner-devops`, `@owner-platform` |
| **G6 Production Readiness** | Secrets checklist complete, env parity verified, no High/Critical unresolved | `@owner-security` |
| **G7 Go/No-Go** | Signed release board: all P0 = done, blockers = none | `@owner-release` |
| **G8 Release Executed** | Production deployment log + health endpoint proofs for all services | `@owner-devops` |
| **G9 Operational Signoff** | 72h stability indicators, incident count, SLO status | `@owner-platform` |
| **G10 Production Completion** | Consolidated completion report + lessons learned + artifact index | `@owner-release` |

---

## 6) Top Risks, Triggers, Mitigations

| Risk | Trigger | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Foundation OID4VP regression returns | Nonce/state mismatch in gate runs | Release blocked | Add deterministic fixture tests + replay prevention checks before D4 | `@owner-recruiter` |
| Wallet test instability resurfaces | Flaky/missing dependencies | Confidence gap | Pin/repair test deps and run repeated deterministic loops | `@owner-wallet` |
| CI evidence stale vs release SHA | Hosted runs only green on old commit | Audit failure | Mandatory workflow_dispatch on release SHA at D5 | `@owner-devops` |
| Secret/env drift between staging/prod | `gate:launch:strict` fails late | Cutover delay | Preflight env parity at D6-D8 with strict checklist | `@owner-security` |
| Chain write/revocation edge failures | Sepolia/mainnet policy mismatch | Trust/reliability risk | Enforce chain-policy tests + smoke tx proof prior to G6 | `@owner-issuer` |
| Cross-service contract drift | API response schema changes unnoticed | Runtime breakage | Contract snapshots + end-to-end regression at D6 | `@owner-qa` |
| Rollback path unproven | Incident during rollout | Extended downtime | Rehearsed rollback at D7 + documented commands | `@owner-platform` |

---

## 7) Milestone Summary

- **Milestone A (D0-D3):** Engineering blockers removed in parallel.  
- **Milestone B (D4-D6):** All local + hosted gates + integrated E2E evidence achieved.  
- **Milestone C (D7-D9):** Staging rehearsal + production readiness + formal go/no-go.  
- **Milestone D (D10-D14):** Controlled release, stabilization, and final production completion signoff.

---

## 8) Immediate Next Actions (Today)

1. Confirm lane owners and SLA for blocker turnaround (<12h on P0).  
2. Start D0 artifact set: release board refresh, risk register, dependency tracker.  
3. Assign foundation gate fix and wallet harness repair as first critical-path tasks.  
4. Reserve CI refresh window for D5 release-SHA evidence collection.
