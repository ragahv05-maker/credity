## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2024-08-24 - Missing Tenant ID Verification on Multi-Tenant Team Resources
**Vulnerability:** IDOR vulnerability on the team endpoints (GET, PUT, DELETE for `/team/:id`) where a user from one tenant could access or modify team members belonging to another tenant by providing their ID, because the API only validated that the record existed.
**Learning:** When retrieving, updating, or deleting multi-tenant resources, we cannot rely on the ID alone for authorization. The API must explicitly check `resource.tenantId === req.tenantId`. Returning `404 Not Found` for cross-tenant mismatches is crucial to prevent leaking the existence of valid resource IDs.
**Prevention:** Ensure every endpoint interacting with multi-tenant data retrieves the entity first, compares its `tenantId` to the authenticated user's `tenantId`, and returns `404` if they do not match, before proceeding with any action.
