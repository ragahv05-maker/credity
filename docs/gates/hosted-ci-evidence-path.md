# Hosted CI Evidence Path (Release Board P0D)

Purpose: produce auditable, hosted evidence (run URLs + downloadable artifacts) for release-board P0 rows.

## Workflows in scope

- `.github/workflows/quality-gates-ci.yml`
- `.github/workflows/contract-security-ci.yml`
- `.github/workflows/launch-gate.yml`

Each workflow now publishes an artifact:

- `quality-gates-evidence-<run_id>`
- `contract-security-evidence-<run_id>`
- `launch-gate-evidence-<run_id>`

Artifacts contain run metadata and job result summaries suitable for audit packets.

## Operator steps (GitHub-hosted)

1. Trigger workflows on release branch/PR (or `workflow_dispatch`).
2. Wait for green completion.
3. Capture run URLs:
   - Quality gates run URL
   - Contract security run URL
   - Launch gate run URL
4. Download/link the three evidence artifacts from each run.
5. Generate a release-board mapping pack:

```bash
cd /Users/raghav/Desktop/credity
npm run ci:evidence:pack -- \
  --sha=<release_commit_sha> \
  --ref=<release_branch_or_tag> \
  --qualityRun=<quality_run_url> \
  --contractRun=<contract_run_url> \
  --launchRun=<launch_run_url> \
  --out=swarm/reports/ci-evidence-pack.latest.md
```

## GO/NO-GO mapping (S28)

- **P0-03** Cross-service quality gates pass
  - Source: quality-gates-ci + launch-gate run summaries/artifacts
- **P0-04** CI release workflow validation
  - Source: quality-gates-ci green run URL + artifact
- **P0-05** Security high/critical sweep
  - Source: dependency-security + contracts-security results in quality-gates-ci and contract-security-ci artifact

## Acceptance evidence checklist

- [ ] All three run URLs are captured in the release board
- [ ] All three evidence artifacts are attached or linked
- [ ] `swarm/reports/ci-evidence-pack.latest.md` generated and referenced in `credity-s28-release-board.md`
- [ ] P0-03/P0-04/P0-05 statuses updated using hosted results only
