# Ops Telemetry SLA Dashboard

Generated: 2026-02-20T22:14:53.564Z

| Service   | Availability % | p95 (ms) | p99 (ms) | Metrics endpoint | Trace headers |
| --------- | -------------: | -------: | -------: | ---------------- | ------------- |
| gateway   |              0 |       21 |       21 | FAIL (0)         | FAIL          |
| issuer    |              0 |        5 |        5 | FAIL (0)         | FAIL          |
| wallet    |              0 |        3 |        3 | FAIL (0)         | FAIL          |
| recruiter |              0 |        4 |        4 | FAIL (0)         | FAIL          |

## SLA policy

- Availability target: >= 99.0% over probe window
- API latency target: p95 < 800ms, p99 < 1200ms
- Metrics scrapeability: /api/metrics returns Prometheus text format
- Trace/log correlation: x-request-id and x-trace-id visible in responses/logs
