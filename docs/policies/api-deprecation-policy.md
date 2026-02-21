# API Deprecation Policy (v1)

## Scope

This policy applies to Gateway mobile proxy contracts and all `/v1/*` Issuer + Recruiter APIs.

## Commitments

- Minimum deprecation notice: **90 calendar days**.
- Deprecated routes must emit a `Sunset` header with the final removal date.
- Breaking removals are allowed only in a major API version transition (`v1` -> `v2`).
- New optional fields can be added in minor revisions without breaking existing clients.

## Communication Channels

- `CHANGES.md`
- In-app dashboard release banner
- Email notice to registered integration owners

## Versioning Rules

- Path versioning is mandatory (`/v1/...`).
- Behavior changes that alter validation, auth requirements, or response shape require changelog entry and rollout window.
- Existing fields are never removed from the same major version.

## Runtime Safety Rules

- Write endpoints must support `Idempotency-Key`.
- Webhook producers must sign payloads.
- Demo-only endpoints must be unavailable unless `ALLOW_DEMO_ROUTES=true` in non-production.

## Emergency Exceptions

Critical security hotfixes can bypass notice windows. In those cases:

- Document reason and impacted endpoints in `CHANGES.md`.
- Publish mitigation guidance in the same release cycle.
