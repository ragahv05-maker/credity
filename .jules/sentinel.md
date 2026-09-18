## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2025-02-18 - [Insecure Direct Object Reference (IDOR) on Team Members]
**Vulnerability:** The endpoints `/team/:id`, `/team/:id/role`, `/team/:id/status`, and `DELETE /team/:id` did not verify if the requested team member's `tenantId` matched the caller's `tenantId`.
**Learning:** Any object retrieval by ID MUST validate that the object belongs to the requester's context/tenant. Otherwise, a user from Tenant A could modify or delete users in Tenant B simply by guessing their UUID. Furthermore, returning a 404 instead of a 403 when a cross-tenant ID is queried ensures that the existence of the resource is not leaked.
**Prevention:**
1. Always retrieve the object first and assert ownership/tenant ID constraints before applying updates, deletes, or returning data.
2. For multi-tenant applications, ensure every parameterized route securely validates the tenant boundary against `req.tenantId` or equivalent.
