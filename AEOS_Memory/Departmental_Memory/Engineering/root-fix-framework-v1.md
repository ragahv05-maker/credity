# Root-Fix Framework v1 (Engineering)

## Objective

When something breaks, fix it at the **root cause** and prevent repeat failures.

## Non-Negotiables

1. **Reproduce first** (never patch blindly).
2. **Policy locks stay intact** (e.g., `INVALID_SIGNATURE => FAIL`, unsigned/scanned => `REVIEW`).
3. **No speculative code** (no fake success paths, no unverified assumptions).
4. **No redundancy** (avoid duplicate logic paths when one shared path can be canonical).
5. **Evidence-only done** (tests/checks/artifacts must pass before closure).

## Required Flow (every bug/fix)

1. **Capture failure**
   - endpoint/module
   - failing input
   - observed vs expected behavior
2. **Root-cause isolate**
   - identify first incorrect decision point in code path
   - confirm why prior guard did not catch it
3. **Patch minimally at source**
   - prefer one canonical fix point over multi-file patching
   - preserve external contract unless explicitly changed
4. **Add/adjust regression tests**
   - one test for reproduced failure
   - one policy/contract guard test (if relevant)
5. **Run gates**
   - targeted tests
   - service typecheck
   - relevant cross-service contract gate if touched
6. **Record evidence**
   - changed files
   - exact commands
   - pass/fail outcomes

## Anti-Redundancy Rules

- If mapping/decision logic appears in multiple places, centralize to helper/service and reference it.
- Prefer extending existing contracts/types over creating parallel ad-hoc shapes.
- Remove dead branches introduced by prior temporary fixes.

## Anti-Hallucination Rules (code + delivery)

- Never claim a fix without a passing command result.
- Never claim an integration path works if fallback path was actually taken.
- If a command fails, report it directly and continue with corrected rerun.

## Enforcement

Run: `npm run gate:root-fix`

- Fails if code changed without corresponding test updates.
- Fails on explicit temporary-hack markers in changed service/source files.

## Definition of Done (Root-Fix)

A fix is done only when:

- root cause is corrected,
- regression + policy/contract tests pass,
- typecheck passes,
- evidence is logged in AEOS memory/report.
