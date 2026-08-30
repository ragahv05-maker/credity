## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-03-09 - [Insecure Direct Object Reference (IDOR) in Team Members]
**Vulnerability:** Endpoints managing multi-tenant resources like team members in `CredVerseIssuer 3/server/routes/team.ts` did not validate that the requested resource's `tenantId` matched the authenticated user's `tenantId` (e.g. `member.tenantId !== tenantId`).
**Learning:** For multi-tenant architectures, it's not enough to check if an object exists; you must explicitly verify ownership or context for *every* read and write operation to prevent cross-tenant access.
**Prevention:**
1. Always validate `tenantId` on specific resource operations (GET, PUT, DELETE).
2. Fail securely by returning a `404 Not Found` rather than `403 Forbidden` for IDOR mismatches to avoid leaking existence of valid resource IDs in other tenants.
