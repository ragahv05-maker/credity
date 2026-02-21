# Credity S33 — 9+/10 Program Plan (Rigorous)

_Last updated: 2026-02-15 (Asia/Calcutta)_

## 0) Mission

Move Credity from strict baseline (~5.9/10) to:

- **Tomorrow:** 7.0–7.4/10 (credible ship-quality uplift)
- **72 hours:** 7.6–8.1/10
- **10–14 days:** **9.0+/10**

Non-negotiables:

- Preserve **W3C DID/VC** compatibility
- Preserve **ZK-native** direction
- No security/quality shortcuts
- Evidence-backed status only

---

## 1) 9+/10 Quality Rubric (must pass)

A surface is 9+/10 only if:

1. Weighted score >= 9.0 (task success, speed, recovery, trust clarity, accessibility, reliability)
2. All global hard gates pass:
   - DID/VC conformance pass
   - ZK proof vector pass
   - No open high/critical security findings
   - Core funnel telemetry coverage complete
   - Rollback + incident readiness validated

Surface goals:

- Website: message clarity + conversion + lighthouse + accessibility
- Wallet: high completion for receive/share/prove + recovery UX + crash-free sessions
- Issuer: reliable issuance/revocation + auditability + schema clarity
- Recruiter: sub-minute decisioning + explanation quality + zero false-accept in test vectors

---

## 2) Workstream Structure (parallel)

- **WS1 Product/UX (Website + Wallet + Recruiter + Issuer UX)**
- **WS2 Backend Reliability/Security**
- **WS3 DevOps/Release/Observability**
- **WS4 QA/Conformance/Evidence**

Cross-cutting SWAT:

- **Dependency SWAT:** any blocker >4h auto-escalates
- **Evidence Cell:** release artifacts + go/no-go packet

---

## 3) Critical Path Timeline

## T+24h (Phase A)

Goal: eliminate weakest points and lock execution controls.

1. Website architecture + visual hierarchy rebuild (highest score lift)
2. Wallet/recruiter core flow friction removal
3. Merge-blocking conformance/test gates confirmed
4. Telemetry + error taxonomy visible for core funnel
5. Latest CI evidence pack refreshed on head

Exit criteria:

- Latest quality-gates CI green
- Core flows demonstrably stable
- New score estimate >= 7.0

## T+72h (Phase B)

Goal: harden reliability and operational confidence.

1. UX consistency pass across all primary flows
2. Reliability pass (timeouts, retries, degraded mode handling)
3. Monitoring + alerting + SLO dashboards active
4. Foundation/smoke gates deterministic in local + hosted contexts
5. Production cutover checklist fully pre-staged

Exit criteria:

- Score estimate >= 7.6
- Only credential-dependent blockers remain

## T+10–14d (Phase C)

Goal: premium 9+/10 readiness.

1. Advanced polish (microinteractions, copy precision, mobile excellence)
2. Security + ops maturity (restore drills, incident rehearsal, rollback drill)
3. Final conformance/security evidence pack
4. Controlled pilot feedback loop + last fixes

Exit criteria:

- 9+/10 on rubric
- Full GO packet approved

---

## 4) Master To-Do List (prioritized)

## P0 (start immediately)

- [ ] Website full hierarchy redesign (not patchwork)
- [ ] Wallet golden flow: receive -> store -> disclose -> prove
- [ ] Recruiter decision page clarity + reason-code UX
- [ ] Issuer issuance form constraints + schema guidance
- [ ] Conformance/security gates verified on latest head
- [ ] Release board + CI evidence updated

## P1

- [ ] Unified design token pass across recruiter/wallet/gateway
- [ ] Bulk/edge-case UX reliability improvements
- [ ] Telemetry dashboard for funnel and failures
- [ ] Alert policy and runbook coverage for top incidents

## P2

- [ ] Deep polish (motion, content rhythm, doc ergonomics)
- [ ] Extended ops simulation and drill automation
- [ ] Secondary integrations and exports refinement

---

## 5) Blocker Matrix (autonomous vs needs user)

Autonomous now:

- Code quality/UX/backend/security hardening
- CI/test/gate improvements
- Docs/checklists/evidence generation

Needs user credentials/input:

- Final production secrets and secret manager access
- Permanent domain/hosting account access and DNS
- Final chain/wallet approvals for any irreversible cutover

---

## 6) Risks & Second-order effects (RAG)

- **Red:** rushing visual overhaul without UX test loops -> polished UI but weak conversion
- **Red:** skipping ops hardening -> launch succeeds then trust fails on incident
- **Amber:** parallel merges increase regression risk -> require strict CI + integration windows
- **Amber:** over-optimizing one surface hurts end-to-end flow -> prioritize golden-path outcomes

Mitigation:

- Hourly integration checkpoints
- Merge windows + owner sign-off
- Evidence-before-claim policy

---

## 7) Operating Cadence

- Hourly 15-min control review (blockers, risks, decisions)
- Daily scorecard refresh per surface
- End-of-day: shipped delta, remaining blockers, next-day critical path

---

## 8) Definition of Done (Program)

Program is done when:

- Quality rubric >=9.0 equivalent achieved and evidenced
- Hard gates pass consistently
- Production ops readiness proven (not just documented)
- Remaining blockers are zero or explicitly accepted by owner
