# Phase A SLA Evidence (Trust / Reputation / WorkScore)

Generated: 2026-02-20T15:26:08.672Z  
Repo: `/Users/raghav/Desktop/credity12`  
Target SLA: **< 1s** for compute/update latency (local environment evidence)

## What was added

- `scripts/phaseA-sla-evidence.mjs`
  - Local benchmark harness for:
    - Trust score compute latency
    - Reputation score compute latency
    - WorkScore compute latency
    - Reputation async update/sync propagation latency
- `scripts/phaseA-sla-evidence.test.mjs`
  - `node:test` assertion that p95 for all above metrics is `< 1000ms`

## Execution evidence

### Harness run

Command:

```bash
node scripts/phaseA-sla-evidence.mjs
```

Raw output snapshot (`/tmp/phaseA-sla-evidence.json`):

```json
{
  "targetMs": 1000,
  "metrics": {
    "trustComputeMs": { "samples": 10000, "avgMs": 0.0002598370000000273, "p95Ms": 0.0006249999999994316, "p99Ms": 0.0006660000000096034, "maxMs": 0.06504199999999116 },
    "reputationComputeMs": { "samples": 2000, "avgMs": 0.013714991999999818, "p95Ms": 0.037750000000002615, "p99Ms": 0.059750000000008185, "maxMs": 0.2464169999999939 },
    "workscoreComputeMs": { "samples": 10000, "avgMs": 0.00015512679999985437, "p95Ms": 0.0002499999999940883, "p99Ms": 0.0002910000000042601, "maxMs": 0.0780420000000106 },
    "reputationSyncUpdateMs": { "samples": 80, "avgMs": 1.2591119624999976, "p95Ms": 1.3404160000000047, "p99Ms": 1.5581670000000258, "maxMs": 1.5581670000000258 }
  }
}
```

### Test gate

Command:

```bash
node --test scripts/phaseA-sla-evidence.test.mjs
```

Result: **PASS** (1/1)

## SLA verdict (local evidence)

| Metric | p95 (ms) | SLA < 1000ms |
|---|---:|---|
| Trust compute | 0.000625 | ✅ Pass |
| Reputation compute | 0.03775 | ✅ Pass |
| WorkScore compute | 0.00025 | ✅ Pass |
| Reputation sync update | 1.340416 | ✅ Pass |

## Notes / scope

- This is **Phase A local harness evidence**, focused on algorithmic and async-update timing behavior.
- Measurements are from local runtime and are suitable as PRD gap-matrix evidence for sub-second compute/update feasibility.
- Production p95/p99 should still be validated with full service dependencies + networked infra telemetry.
