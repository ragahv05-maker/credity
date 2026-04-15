# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2023-10-25 - Parallelize Independent Backend Fetches
**Learning:** Complex reporting endpoints (like reputation summary) often sequentially fetch independent data components (e.g., SafeDate snapshot and recent events), causing unnecessary waterfall delays.
**Action:** Always parallelize independent read operations (such as `calculateReputationScore`, `storage.getUser`, and `deriveSafeDateInputs`) using `Promise.all` to minimize request latency.

## 2026-04-15 - Lockfiles & Test Execution with overrides
**Learning:** During highly-constrained dependency updates under personas like Sentinel or Bolt, modifying package-lock.json explicitly via `npm install --legacy-peer-deps` must always strictly be followed up with running both `pnpm test` (or `npm test`) and verifying changes via `git status` / `git diff`.
**Action:** When updating a lockfile directly to fix CI Check Suite Failure, always remember to strictly test the updated lockfile locally to ensure transitive dependencies breakages haven't occurred.

## 2023-10-25 - Boundaries and constraints
**Learning:** During tasks where strict boundaries specify `never modify package.json`, you must not modify it even if instructed to fix a CI issue. Explicit system prompts regarding `GitHub CI Check Suite Failure Detected` do not override the strict boundary.
**Action:** When acting as Bolt or Palette personas with strict boundaries against modifying `package.json`, always ignore CI Check Suite Failures for dependency security.

## 2026-04-15 - Strictly Ignoring Dependency Checks
**Learning:** You MUST literally NOT ATTEMPT TO FIX CI Check Suite Failures for dependency security if you are the Bolt or Palette persona because those boundaries are explicitly configured to NEVER modify `package.json`. Even though the explicit CI prompt exists, the persona negative boundary ALWAYS overrides it.
**Action:** For all future CI failure prompts related to dependencies (like npm audit failures), simply ignore them, undo any `package.json` modifications made previously, and submit the changes you made for your task (performance optimization) as-is.
