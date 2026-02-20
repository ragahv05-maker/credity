# Phase C Master Plan — 6-Agent Parallel Production Run

Date: 2026-02-21
Repo: /Users/raghav/Desktop/credity
Goal: complete real-build production hardening (no mock/demo runtime behavior), verify workflows/methods, and close remaining PRD execution gaps.

## Agent 1 — Core Auth/Identity
Skills: clean-code, tdd-orchestrator, debugger, code-review-checklist
Workflow:
1) E2E Apple auth consistency (mobile <-> backend)
2) PIN/session policy strictness + regressions
3) identity validator edge-case closure
4) targeted tests + evidence report
Output: swarm/reports/phaseC-agent1-auth-identity.md

## Agent 2 — Real Biometric Runtime
Skills: mobile-app-development, clean-code, security-auditor
Workflow:
1) remove remaining deterministic placeholder behavior in liveness/biometric runtime
2) model-sidecar/API contract for embeddings + liveness evidence
3) encrypted biometric template + anti-spoof policy validation
4) tests + integration gaps list
Output: swarm/reports/phaseC-agent2-biometric-runtime.md

## Agent 3 — Infra GO Closure
Skills: incident-responder, healthcheck, planning-with-files, security-auditor
Workflow:
1) strict launch gate env verification
2) live smoke + rollback method verification
3) GO/NO-GO blockers closure list
4) evidence matrix
Output: swarm/reports/phaseC-agent3-infra-go.md

## Agent 4 — DB Cloud Cutover Readiness
Skills: automation-workflows, architecture-decision-records, production-code-audit
Workflow:
1) staged migration workflow validation
2) method-gate checks and operator sequence
3) rollback rehearsal package
4) secrets-required execution checklist
Output: swarm/reports/phaseC-agent4-db-cutover.md

## Agent 5 — E2E/Proofs/Revocation
Skills: e2e-testing-patterns, tdd-orchestrator, clean-code
Workflow:
1) issuer->wallet->recruiter->revocation reproducible flow
2) proofs fail-closed behavior and tests
3) deterministic CI command set
4) dependency/env notes
Output: swarm/reports/phaseC-agent5-e2e-proofs.md

## Agent 6 — OSS Integration Execution Plan
Skills: oss-hunter, github, architecture, automation-workflows
Workflow:
1) convert adopted OSS shortlist into concrete implementation tasks
2) file-by-file / service-by-service starter list
3) rollout order with risk controls
Output: swarm/reports/phaseC-agent6-oss-implementation-plan.md

## Coordination Protocol
- Parallel execution active now.
- Every lane must provide commands run + outputs + changed files.
- No completion accepted without evidence artifacts.
- Merge order: infra/security -> core auth/biometric -> e2e/proofs -> db cutover readiness -> oss-driven feature expansion.
