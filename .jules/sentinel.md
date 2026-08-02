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
