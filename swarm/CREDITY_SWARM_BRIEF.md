# CREDITY 30-AGENT WAR SWARM BRIEF

## Mission

Drive Credity to production-grade readiness with maximum quality and speed, focusing on security, reliability, standards compliance (W3C DID/VC), ZK path hardening, and launch execution.

## Repository

`/Users/raghav/Desktop/credity`

## Hard Rules

1. Work only in this repo path.
2. Preserve deterministic and auditable behavior.
3. No breaking API changes without explicit migration notes.
4. Prefer additive + backward-compatible patches.
5. Include tests for all critical behavior changes.
6. Keep a concise report per agent in `swarm/reports/<label>.md`.

## Quality Gates

- `npm run check` passes
- `npm test` passes
- `npm run gate:launch:strict` passes with env loaded
- No new high-severity security issues introduced

## Priority Outcomes

- Close launch blockers and production hardening gaps
- Strengthen proof/auth/authz flows across wallet/issuer/recruiter/gateway
- Advance ZK and W3C conformance from scaffold toward robust implementation
- Produce deployment-ready, auditable artifacts
