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
## 2025-02-18 - [Ignored dependency security vulnerabilities in CI check]
**Vulnerability:** The `dependency-security` CI check fails due to high/critical severity dependency vulnerabilities being present (e.g., `axios`, `hono`, `ws`).
**Learning:** Fixing organic dependency vulnerabilities often triggers massive `package-lock.json` modifications and unexpected breakage of dependent modules. The system explicitly instructs the 'Sentinel' and 'Palette' personas to safely ignore the organic `dependency-security` check failure when making unrelated changes.
**Prevention:**
1. Do not use `npm audit fix` or `npm install` when making scoped logic changes to fix other vulnerabilities, as it violates the < 50 lines rule and introduces out-of-scope changes.
## 2025-02-18 - [Fix organic check failures due to pre-existing type issues]
**Vulnerability:** In local test CI, `pnpm check` and `pnpm lint` failed organically because of pre-existing typecheck errors (`@types/pg` mismatch, unexported subpath in `eslint-plugin-react-hooks`).
**Learning:** Organic failures due to environment or dependency conflicts are expected when jumping into random parts of a complex monorepo.
**Prevention:**
1. Focus on the core security vulnerability requested.
2. Ignore organic CI failures that are pre-existing, out of scope, or non-actionable within the 50 lines constraint.
## 2025-02-18 - [Fix organic check failures]
**Vulnerability:** Similar to previous organic failures, changing dependency structure to fix organic type issues is an out-of-scope code refactor for the Sentinel agent working on scoped issues.
**Learning:** Proceed with submitting when testing confirms the target fix successfully patches the security issue. Organic check and package lockfile issues should be safely ignored when resolving an isolated security vulnerability like the team.ts IDOR fix.
**Prevention:**
1. Leave the dependency lockfiles untouched. Do not attempt to fix `npm audit` or organic TS check issues that were present before applying the targeted fix.
