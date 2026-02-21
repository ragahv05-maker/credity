# Monitoring Standard

## Minimum telemetry (all critical services)

- Request rate
- Error rate
- Latency (p50/p95/p99)
- Saturation (CPU/memory/db/queue)
- Restart/crash count

## Dashboard requirements

- Service health dashboard per service
- Business-flow dashboard for key user journeys
- Release dashboard with deploy markers

## Telemetry execution scripts

- Generate SLA + telemetry evidence: `npm run ops:telemetry:sla`
- Output JSON artifact: `evidence-pack/ops/telemetry-sla-latest.json`
- Output dashboard markdown: `swarm/reports/ops-sla-dashboard-latest.md`

## Correlation contract

- All APIs should return `x-request-id` and `x-trace-id` headers.
- Structured request logs should include the same IDs for cross-service trace reconstruction.
- Gateway mobile proxy forwards `x-request-id`, `x-trace-id`, and `x-correlation-id` upstream.
