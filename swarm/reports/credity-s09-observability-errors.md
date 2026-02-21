# Credity Swarm S09 — Structured Error Codes + Observability Hardening

## Scope completed

Standardized server-side error semantics and Sentry-safe observability hooks across:

- `BlockWalletDigi` (wallet)
- `CredVerseIssuer 3` (issuer)
- `CredVerseRecruiter` (recruiter)
- `credverse-gateway` (gateway)

## What was implemented

### 1) Unified error-code model + safe context helpers

Added reusable observability helpers with:

- Canonical error code constants (`APP.INTERNAL`, `APP.VALIDATION_FAILED`, `AUTH.INVALID_TOKEN`, etc.)
- Request-context extraction (`requestId`, method, path, ip, userAgent)
- Recursive context sanitizer with sensitive-key redaction and truncation limits

Files added:

- `BlockWalletDigi/server/middleware/observability.ts`
- `CredVerseIssuer 3/server/middleware/observability.ts`
- `CredVerseRecruiter/server/middleware/observability.ts`
- `credverse-gateway/server/services/observability.ts`

### 2) Global error handlers now emit structured responses + safe telemetry

Refactored app error middleware to:

- Normalize unknown errors into a structured shape (status/message/code)
- Map common classes (validation, malformed JWT, bad JSON)
- Return response payload with stable fields:
  - `message`
  - `code`
  - `requestId`
- Emit sanitized context to logging + Sentry

Files updated:

- `BlockWalletDigi/server/middleware/error-handler.ts`
- `CredVerseIssuer 3/server/middleware/error-handler.ts`
- `CredVerseRecruiter/server/middleware/error-handler.ts`
- `credverse-gateway/server/middleware/error-handler.ts` (new)

### 3) Sentry hooks hardened to avoid sensitive-data leakage

Updated Sentry adapters to:

- Sanitize `event.extra` in `beforeSend`
- Sanitize manual capture context (`captureException`)
- Attach `error_code` tag when available
- Avoid attaching email to `Sentry.setUser` (ID + username only)

Files updated:

- `BlockWalletDigi/server/services/sentry.ts`
- `CredVerseIssuer 3/server/services/sentry.ts`
- `CredVerseRecruiter/server/services/sentry.ts`
- `credverse-gateway/server/services/sentry.ts`

### 4) Log redaction strengthened (PII/token classes)

Expanded pino redaction patterns for wallet/issuer/recruiter loggers to include nested token/secret fields plus email/phone.

Files updated:

- `BlockWalletDigi/server/services/logger.ts`
- `CredVerseIssuer 3/server/services/logger.ts`
- `CredVerseRecruiter/server/services/logger.ts`

### 5) Gateway wired into structured error pipeline

Gateway now has:

- API 404 structured response with error code
- Sentry error middleware + custom structured error middleware

File updated:

- `credverse-gateway/server/index.ts`

## Security/Privacy impact

- Reduced risk of leaking secrets/PII into logs and Sentry contexts.
- Validation errors now expose only minimal issue metadata (path/message/code), not raw payload values.
- Error responses now provide stable codes for client/retry/observability workflows.

## Notes

- Full TypeScript verification across all services was started but not completed in-session due runtime overhead; no intentional breaking API changes were made beyond adding `code` and `requestId` to error responses.
