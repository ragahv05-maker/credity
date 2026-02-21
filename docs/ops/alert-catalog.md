# Alert Catalog

## Severity model

- P1: User-visible critical outage/security incident
- P2: Major degradation requiring immediate action
- P3: Minor degradation / non-urgent

## Initial alerts

- API 5xx error rate spike
- p95 latency breach on critical endpoints
- Queue lag over threshold
- DB connection saturation
- Auth failure spike

Each alert must define: threshold, owner, runbook link, escalation path.
