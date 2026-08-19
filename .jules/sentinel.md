## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-03-01 - [IDOR in Multi-Tenant Team Operations]
**Vulnerability:** Found an Insecure Direct Object Reference (IDOR) in `CredVerseIssuer 3/server/routes/team.ts` where multi-tenant endpoints (like update role, update status, delete) did not verify if the target resource's `tenantId` matched the authenticated user's `tenantId`.
**Learning:** In a multi-tenant system, authentication alone isn't enough; authorization must include resource ownership validation on every request, else users can manipulate arbitrary records across tenants by simply guessing/providing valid resource IDs.
**Prevention:**
1. Always validate `resource.tenantId === req.tenantId` for cross-tenant data.
2. Return a `404 Not Found` rather than `403 Forbidden` to avoid leaking the existence of resources in other tenants' environments.
