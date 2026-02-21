# Deployment Strategy

## Approach

- Staging -> Production promotion from same signed artifact.
- Canary progression: 5% -> 25% -> 50% -> 100% with health checks.

## Safety checks per step

- API health/readiness
- Core smoke suite
- Error and latency guardrails

## Ownership

- Release Commander: approve each step
- SRE on-call: monitor and halt/rollback authority
