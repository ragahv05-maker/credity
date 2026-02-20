# CI/CD Quality + DevEx Lane

This lane standardizes reproducible quality gates locally and in GitHub Actions.

## Goals

- Enforce merge-quality gates (lint, check, test, security).
- Keep execution reproducible with one-command scripts.
- Add OSS rollout readiness gates for planned modules from the OSS implementation plan.
- Publish evidence artifacts for release-board traceability.

## Local reproducible commands

From repo root:

```bash
npm run ci:lane:quality:quick
npm run ci:lane:quality
npm run ci:oss:readiness
```

### What each does

- `ci:lane:quality:quick`
  - `npm ci`
  - `npm run lint`
  - `npm run check`
  - `npm run test`
- `ci:lane:quality`
  - all quick steps + `npm run gate:launch:strict`
- `ci:oss:readiness`
  - Runs optional gates for OSS-plan modules and SLA suites when they exist:
    - `packages/policy-rules`
    - `packages/workflows-temporal`
    - wallet dispute SLA tests
    - recruiter WorkScore SLA tests
    - wallet gig fast-track contract tests
  - Missing modules/suites are marked **skip** (not fail) to support staged rollout.

## CI workflow wiring

Workflow: `.github/workflows/quality-gates-ci.yml`

Primary jobs:

- `lint` (or mobile `typecheck`)
- `check`
- `test`
- `contracts-security`
- `dependency-security`
- `oss-readiness`

Artifacts:

- `quality-gates-evidence-<run_id>`
- `oss-readiness-evidence-<run_id>`

## Developer workflow recommendation

Before opening PR:

1. `npm run ci:lane:quality:quick`
2. If release-sensitive docs/config changed: `npm run ci:lane:quality`
3. If working on OSS rollout modules (F5A/F7/F8/F5B lane): `npm run ci:oss:readiness`

This sequence mirrors hosted CI and reduces review ping-pong.
