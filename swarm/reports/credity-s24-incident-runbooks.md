# Credity Swarm S24 — Incident/Rollback Runbook Expansion

## Scope completed

Expanded operational runbooks with concrete diagnosis/remediation steps for:

1. Auth failures
2. Queue/deferred mode incidents
3. Blockchain relayer/anchoring incidents
4. Gateway proxy incidents

## Files updated

- `docs/runbooks/incident-response.md`
- `docs/runbooks/rollback.md`

## What was added

### 1) Incident response runbook enhancements

- Added a **Fast Triage Checklist** for all incidents (blast radius, incident family classification, request ID capture, change-window correlation).
- Added **playbooks per incident family** with explicit:
  - Diagnosis steps
  - Remediation steps
  - Verification checks

#### Auth playbook

- Differentiates 401 vs 403 classes.
- Covers JWT/API-key path differences and role claim/policy breakages.
- Includes gateway/header forwarding and CORS/auth-header validation.

#### Queue/deferred playbook

- Explicit checks for Redis/queue connectivity and queue endpoints:
  - `/v1/queue/stats`
  - `/v1/queue/dead-letter`
- Uses known queue failure modes (`QUEUE_UNAVAILABLE`, stalled jobs, DLQ growth).
- Adds controlled degraded-mode guidance and safe replay sequencing.

#### Relayer playbook

- Validates relayer + chain config (`RELAYER_PRIVATE_KEY`, `CHAIN_NETWORK`, RPC envs).
- Classifies signing vs RPC vs nonce/gas failures.
- Adds recovery sequencing for pending anchors and retry strategy.

#### Gateway proxy playbook

- Focuses on upstream routing, header forwarding (`Authorization`, `X-Forwarded-*`), OAuth callback mismatches, CORS drift.
- Includes verification for end-to-end login and protected API calls.

---

### 2) Rollback runbook enhancements

- Added precondition for explicit IC approval.
- Added **scenario-specific rollback guidance** for:
  - Auth
  - Queue/deferred
  - Relayer
  - Gateway proxy
- Added **post-rollback validation matrix** aligned to the same four incident families.
- Added explicit requirement to record restored artifacts + config versions.

## Notes

- Content aligns with existing repo conventions and known env/config names from deployment docs.
- No code-path changes were made; this task is documentation/runbook expansion only.
