# Credity12 Agent-Skill Orchestration Plan

Date: 2026-02-20
Primary Repo: /Users/raghav/Desktop/credity12

## Objective
Keep all production agents in sync, attach each lane to explicit skills, and execute PRD-completion + infra hardening in parallel with evidence-first delivery.

## Installed missing skills (from antigravity-awesome-skills)
- clean-code
- oss-hunter
- code-review-checklist
- debugger
- incident-responder
- architecture-decision-records
- tdd-orchestrator
- security-auditor
- planning-with-files
- production-code-audit

Installed at:
- /Users/raghav/.openclaw/workspace-dev/skills/vendor/antigravity-awesome/<skill-name>

Note: `e2e-testing-patterns` was discovered but flagged HIGH by skill guard (contains package-install commands), so it was intentionally held for manual approval.

## Production Team (Skill-Equipped)

### 1) Program Commander (Sync lead)
- Mission: cross-lane planning, dependency management, decision control.
- Skills: product-development, automation-workflows
- Outputs: daily war-room update, unblock list, milestone signoff.

### 2) PRD Closure Squad
- Mission: close P0/P1 PRD gaps from `swarm/reports/prd-gap-matrix-credity12.md`.
- Skills: clean-code, product-development, nextjs, mobile-app-development
- Outputs: feature completion PRs + acceptance-test evidence.

### 3) Quality & Standards Squad
- Mission: conformance gates, tests, regressions, API contract checks.
- Skills: clean-code, coding-agent
- Outputs: CI pass matrix + failing-test burn-down + release-quality report.

### 4) Infra/SRE Squad
- Mission: live readiness, rollback drills, health/smoke automation.
- Skills: automation-workflows, healthcheck
- Outputs: GO/NO-GO dashboard, runbooks, on-call checks.

### 5) Cloud Data Squad
- Mission: Supabase migration execution using runbook/checklist.
- Skills: automation-workflows, coding-agent
- Inputs: docs/ops/supabase-migration-runbook.md, docs/ops/supabase-migration-checklist.md
- Outputs: migration dry-run, cutover evidence, rollback test evidence.

### 6) OSS Benchmark Squad
- Mission: use OSS hunter to fetch best-in-class reference implementations for missing PRD modules.
- Skills: oss-hunter, github
- Outputs: curated shortlist + adopt/reject rationale for each candidate.

## Sync Protocol (single-source-of-truth)
1. Every lane writes updates to `swarm/reports/session-notes-YYYY-MM-DD.md` (append-only).
2. Every 2 hours: Program Commander publishes lane status table (Done/In-Progress/Blocked).
3. Merge policy: security/infra fixes first, then feature PRs, then cleanup/refactor.
4. No completion claim without: command + log + artifact path.

## Work Plan (execution order)

## Phase A (0-6h)
- A1: close top P0 auth gaps (Apple Sign-in, PIN fallback/session evidence).
- A2: identity verification hardening + face/doc checks.
- A3: trust/reputation SLA instrumentation and evidence scripts.
- A4: infra blocker cleanup from `infra-live-audit-credity12.md`.

## Phase B (6-12h)
- B1: WorkScore ATS + 5-minute verification SLA implementation.
- B2: Gig onboarding API + universal profile foundations.
- B3: Supabase staging migration dry-run (expand/dual-write/verify).

## Phase C (12-24h)
- C1: production cutover readiness and smoke suite.
- C2: full E2E evidence refresh (issuer->wallet->recruiter + revocation).
- C3: GO/NO-GO packet publication.

## Mandatory Deliverables per lane
- Patch/PR link
- Test/gate commands + output
- Artifact location in swarm/reports
- Risk notes and rollback note

## Immediate Next Actions
1. Activate OSS Benchmark Squad to gather references for P0 FAIL/PARTIAL PRD items.
2. Start Cloud Data Squad with provided Supabase credentials.
3. Begin PRD Closure Squad implementation batch #1 (P0 auth + identity + SLA evidence).
