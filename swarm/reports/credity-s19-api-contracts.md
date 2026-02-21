# Credity Swarm S19 — API Contract Snapshots + Error Taxonomy Consistency

## Scope completed

Produced OpenAPI-style contract snapshots for **critical routes** across:

- `credverse-gateway`
- `BlockWalletDigi` (wallet)
- `CredVerseIssuer 3` (issuer)
- `CredVerseRecruiter` (recruiter)

Also documented cross-service **error code taxonomy consistency** and identified small deltas.

No runtime code changes were required for this task (documentation-only output).

---

## 1) Contract snapshot (critical routes)

> Snapshot basis: current route handlers in `server/routes/*.ts` and route registration (`server/routes.ts` / `server/index.ts`).

### A. Gateway (`credverse-gateway`) — critical auth/SSO routes

```yaml
openapi: 3.0.3
info:
  title: CredVerse Gateway API (Snapshot)
  version: s19
servers:
  - url: /api
paths:
  /auth/status:
    get:
      summary: OAuth/SSO capability status
      responses:
        "200":
          description: Status payload
  /auth/google:
    get:
      summary: Start Google OAuth flow
      responses:
        "302": { description: Redirect to Google consent }
        "503": { description: OAuth not configured }
  /auth/google/callback:
    get:
      summary: OAuth callback + session establishment
      parameters:
        - in: query
          name: code
          schema: { type: string }
        - in: query
          name: state
          schema: { type: string }
      responses:
        "302": { description: Redirect to gateway UI with status }
  /auth/me:
    get:
      summary: Resolve authenticated session user
      responses:
        "200": { description: User + ssoToken }
        "401": { description: Not authenticated }
  /auth/verify-token:
    post:
      summary: Cross-app token verification
      requestBody:
        required: false
      responses:
        "200": { description: { valid: boolean, user?, app } }
  /auth/logout:
    post:
      summary: Clear session cookies + server-side session
      responses:
        "200": { description: Logout success }
```

### B. Wallet (`BlockWalletDigi`) — critical holder routes

```yaml
openapi: 3.0.3
info:
  title: CredVerse Wallet API (Snapshot)
  version: s19
servers:
  - url: /api/v1
paths:
  /auth/register:
    post:
      summary: Register holder account
      responses:
        '201': { description: user + access/refresh tokens }
        '400': { description: validation failure }
        '409': { description: username exists }
        '429': { description: rate limited }
  /auth/login:
    post:
      summary: Login holder
      responses:
        '200': { description: user + tokens }
        '401': { description: invalid credentials }
  /wallet/init:
    post:
      summary: Initialize wallet + DID
      security: [{ bearerAuth: [] }]
      responses:
        '200': { description: wallet initialized }
        '500': { description: WALLET_INIT_FAILED }
  /wallet/status:
    get:
      summary: Wallet status + stats
      security: [{ bearerAuth: [] }]
      responses:
        '200': { description: DID + stats }
  /wallet/credentials:
    get:
      summary: List credentials (optional category filter)
      security: [{ bearerAuth: [] }]
      responses:
        '200': { description: credentials[] }
    post:
      summary: Store credential
      security: [{ bearerAuth: [] }]
      responses:
        '200': { description: stored credential }
  /wallet/offer/claim:
    post:
      summary: Claim offered credential from issuer URL
      security: [{ bearerAuth: [] }]
      responses:
        '200': { description: OFFER_CLAIMED }
        '400': { description: missing url }
        '500': { description: OFFER_CLAIM_FAILED }
```

### C. Issuer (`CredVerseIssuer 3`) — critical issuance routes

```yaml
openapi: 3.0.3
info:
  title: CredVerse Issuer API (Snapshot)
  version: s19
servers:
  - url: /api/v1
paths:
  /auth/login:
    post:
      summary: Issuer login (2FA-aware)
      responses:
        "200": { description: tokens OR pending 2FA token }
        "401": { description: invalid credentials }
  /credentials/issue:
    post:
      summary: Issue one credential
      responses:
        "201": { description: issued credential }
        "400": { description: missing required fields }
        "403": { description: ISSUER_FORBIDDEN }
        "503": { description: QUEUE_UNAVAILABLE (infra/runtime) }
  /credentials/bulk-issue:
    post:
      summary: Submit bulk issuance
      responses:
        "202": { description: bulk job accepted }
        "400": { description: invalid payload }
  /credentials/{id}/offer:
    post:
      summary: Create wallet claim offer URL/deep link
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      responses:
        "200": { description: offerUrl + deepLink }
        "404": { description: credential not found }
  /credentials/{id}/revoke:
    post:
      summary: Revoke credential (idempotent-aware)
      responses:
        "200": { description: CREDENTIAL_REVOKED or CREDENTIAL_ALREADY_REVOKED }
        "403": { description: ISSUER_FORBIDDEN }
        "404": { description: credential not found }
```

### D. Recruiter (`CredVerseRecruiter`) — critical verification routes

```yaml
openapi: 3.0.3
info:
  title: CredVerse Recruiter API (Snapshot)
  version: s19
servers:
  - url: /api
paths:
  /auth/login:
    post:
      summary: Recruiter login
      responses:
        "200": { description: user + tokens }
        "401": { description: invalid credentials }
  /verify/instant:
    post:
      summary: Legacy instant verification
      responses:
        "200": { description: verification + fraud result }
        "400": { description: missing jwt/qrData/credential }
  /verify/link:
    post:
      summary: Verify credential by URL fetch
      responses:
        "200": { description: verification result }
        "400": { description: bad/missing link payload }
  /v1/proofs/verify:
    post:
      summary: Proof verification contract endpoint
      responses:
        "200": { description: proof verification contract }
        "400": { description: PROOF_INPUT_INVALID }
        "409": { description: PROOF_REPLAY_DETECTED }
  /v1/verifications/instant:
    post:
      summary: V1 normalized instant verification contract
      responses:
        "200":
          { description: credential_validity/status_validity/decision payload }
```

---

## 2) Error code taxonomy consistency

### Current shared shape (aligned)

All four services now consistently return structured error payload shape from global handlers:

```json
{
  "message": "...",
  "code": "...",
  "requestId": "..."
}
```

### Canonical code families observed

- `APP.*` (internal/validation)
- `AUTH.*` (token/authn/authz)
- `HTTP.*` (request semantics)
- Domain-specific operation codes (e.g., `ISSUER_FORBIDDEN`, `QUEUE_UNAVAILABLE`, `PROOF_INPUT_INVALID`)

### Minor taxonomy deltas found

1. **Gateway** defines `HTTP.NOT_FOUND` in `services/observability.ts`; wallet/issuer/recruiter observability constants currently do not.
2. **Wallet/Issuer/Recruiter** define `AUTH.UNAUTHORIZED`; gateway observability constants currently do not.
3. Domain route handlers still use service-local operation codes (expected and acceptable), but these should remain additive to canonical families.

### Consistency guidance (documented baseline)

Recommended baseline constants for all services:

- `APP.INTERNAL`
- `APP.VALIDATION_FAILED`
- `AUTH.INVALID_TOKEN`
- `AUTH.UNAUTHORIZED`
- `HTTP.BAD_REQUEST`
- `HTTP.NOT_FOUND`

This can be adopted later with tiny, non-breaking constant additions only (no API behavior change required).

---

## 3) Notes / runtime impact

- **Runtime changes made:** none
- **Artifacts produced:** this report with service-level OpenAPI snapshots and taxonomy consistency baseline
- **Risk:** low (documentation-only)

## 4) Source files used for snapshot extraction

- Gateway: `credverse-gateway/server/routes/auth.ts`, `credverse-gateway/server/index.ts`
- Wallet: `BlockWalletDigi/server/routes/{auth,wallet,credentials}.ts`, `BlockWalletDigi/server/routes.ts`
- Issuer: `CredVerseIssuer 3/server/routes/{auth,issuance}.ts`, `CredVerseIssuer 3/server/routes.ts`, `CredVerseIssuer 3/openapi.yaml`
- Recruiter: `CredVerseRecruiter/server/routes/{auth,verification}.ts`, `CredVerseRecruiter/server/routes.ts`
- Taxonomy: `*/server/middleware/error-handler.ts`, `*/server/middleware/observability.ts`, `credverse-gateway/server/services/observability.ts`
