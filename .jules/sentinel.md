## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2024-05-24 - Missing Authorization Checks in Multi-Tenant Endpoints
**Vulnerability:** The team management endpoints allowed cross-tenant access because they did not verify if the requested `id` belonged to the authenticated `tenantId`.
**Learning:** In a multi-tenant environment, retrieving objects by ID must always be accompanied by a check validating that the object belongs to the user's tenant.
**Prevention:** Ensure every backend route that fetches, modifies, or deletes an object verifies ownership via `tenantId` (or similar scope identifier) before proceeding. Return 404 to avoid leaking valid object IDs.
