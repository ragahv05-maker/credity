
## 2024-05-27 - Strict Enforcement of the "One Micro-UX Change" Rule
**Learning:** Monorepo environments present a temptation to batch-apply micro-UX improvements (like missing ARIA labels) across multiple applications at once. However, this violates strict UX task isolation and can accidentally introduce massive changes via lockfile updates when verifying.
**Action:** When identifying multiple potential micro-UX targets, strictly select only ONE target component for the PR to maintain tight scope (< 50 lines) and avoid cross-package contamination.
