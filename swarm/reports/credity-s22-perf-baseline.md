# Credity Swarm S22 — Lightweight Performance Baseline (Critical API Paths)

## Scope

Created a lightweight, local-first baseline harness for critical API paths across:

- `credverse-gateway`
- `BlockWalletDigi` (wallet)
- `CredVerseIssuer 3` (issuer)
- `CredVerseRecruiter` (recruiter)

No heavy infra assumptions (no k6/JMeter/containers required).

---

## Delivered artifacts

1. **Runner script**
   - `scripts/perf-baseline.mjs`
   - Uses Node built-in `fetch` + high-resolution timers (`process.hrtime.bigint()`)
   - Captures per-scenario:
     - success rate
     - min / avg / max
     - p50 / p95 / p99 latency
     - failure samples (status/error)

2. **NPM command**
   - Root `package.json` updated with:
   - `npm run perf:baseline`

3. **Baseline JSON output path (default)**
   - `swarm/reports/data/credity-s22-perf-baseline.json`

---

## Critical API scenarios included

### Gateway

- `GET /api/health`
- `GET /api/auth/status`
- `POST /api/auth/verify-token` (no token path)

### Wallet

- `GET /api/health`
- `POST /api/v1/auth/login` (invalid credentials path)

### Issuer

- `GET /api/health`
- `POST /api/v1/auth/login` (invalid credentials path)

### Recruiter

- `GET /api/health`
- `POST /api/auth/login` (invalid credentials path)
- `POST /api/v1/proofs/verify` (invalid input path)

These are intentionally safe/read-mostly or negative-validation paths so baseline runs are repeatable and low-risk.

---

## How to run

From repo root:

```bash
npm run perf:baseline
```

Optional tuning:

```bash
PERF_ITERATIONS=50 PERF_WARMUP=10 PERF_TIMEOUT_MS=10000 npm run perf:baseline
```

Optional base URL overrides:

```bash
GATEWAY_BASE_URL=http://localhost:5173 \
WALLET_BASE_URL=http://localhost:5002 \
ISSUER_BASE_URL=http://localhost:5001 \
RECRUITER_BASE_URL=http://localhost:5003 \
npm run perf:baseline
```

Optional output override:

```bash
PERF_OUTPUT=swarm/reports/data/my-baseline.json npm run perf:baseline
```

---

## Initial baseline report template

> Fill this section after running the script in a stable local/staging environment.

| Scenario                              | Success Rate |  p50 (ms) |  p95 (ms) |  p99 (ms) |  Avg (ms) | Notes |
| ------------------------------------- | -----------: | --------: | --------: | --------: | --------: | ----- |
| gateway-health                        |    _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |       |
| gateway-auth-status                   |    _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |       |
| gateway-auth-verify-token-no-token    |    _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |       |
| wallet-health                         |    _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |       |
| wallet-auth-login-invalid             |    _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |       |
| issuer-health                         |    _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |       |
| issuer-auth-login-invalid             |    _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |       |
| recruiter-health                      |    _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |       |
| recruiter-auth-login-invalid          |    _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |       |
| recruiter-proofs-verify-invalid-input |    _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |       |

---

## Notes and assumptions

- This baseline is **latency smoke + trend capture**, not a full-scale load/stress test.
- By default the runner executes scenarios sequentially for deterministic comparison and low system impact.
- For apples-to-apples comparisons across commits, keep:
  - same machine class
  - same service startup mode/config
  - same iteration/warmup settings

---

## Suggested next step (optional)

Add a simple parser script that ingests `swarm/reports/data/credity-s22-perf-baseline.json` and auto-updates the markdown table above (to reduce manual copy/paste drift).
