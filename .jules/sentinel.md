## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2025-02-23 - [Insecure Direct Object Reference (IDOR) in API Routes]
**Vulnerability:** API routes managing team members (`GET`, `PUT`, `DELETE` by ID) were directly interacting with the storage layer using user-supplied object IDs without verifying if the requested resource belonged to the authenticated user's `tenantId`.
**Learning:** In multi-tenant systems, implicitly trusting object IDs from route parameters is a critical IDOR vulnerability. Authorization checks must explicitly validate that the target resource's `tenantId` matches the authenticated `req.tenantId` prior to performing read, update, or delete operations.
**Prevention:** Always retrieve the target object first and verify `resource.tenantId === req.tenantId` before completing any operation, or enforce tenant isolation at the database query level.
## 2025-02-23 - [Strict Change Limits vs. Dependency Audits]
**Vulnerability:** Tracked lockfiles (`package-lock.json`) generated organic vulnerabilities that failed the `dependency-security` CI check.
**Learning:** When acting under strict persona constraints (like `< 50 lines` total diff for Sentinel, Bolt, or Palette), resolving lockfile vulnerabilities via `npm audit fix` causes massive diffs (e.g. 4000+ lines) that violate automated code review checks, forcing the PR to be rejected.
**Prevention:** If an organic `dependency-security` failure occurs and you are bound by strict diff limits, do not attempt to run `npm audit fix` or commit lockfile updates. Break the CI loop by acknowledging the pre-existing vulnerability is out-of-scope for the assigned constraint and intentionally leaving it unresolved to comply with PR size limits.
