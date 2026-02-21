# Parallel OSS Wallet Integration Plan (Track B, Non-Blocking)

## Objective

Stand up a **separate prototype track** for selective OSS wallet interoperability without blocking Track A delivery. Scope is intentionally surgical: use OSS references (Veramo / OID4VC ecosystem) only for standards-compliance modules and keep existing CredVerse issuance/verification logic as source-of-truth.

---

## Branch / Track Strategy (isolation-first)

- **Proposed branch:** `prototype/oss-wallet-interop-track-b`
- **Rule:** no rewiring of current prod paths (`/api/v1/oid4vci/*`, `/v1/oid4vp/*`) until parity gates pass.
- **Delivery model:**
  1. Spec + adapter interfaces (no runtime behavior changes)
  2. Feature-flagged prototype endpoints
  3. Optional canary in non-prod

**Flags (new):**

- `OSS_WALLET_INTEROP_ENABLED=false` (master gate)
- `OSS_WALLET_INTEROP_MODE=shadow|active` (default `shadow`)
- `OID4VC_STRICT_CONFORMANCE=false` (tight validation gate)

---

## Current Baseline (already in repo)

- Issuer has OID4VCI endpoints and metadata in:
  - `CredVerseIssuer 3/server/routes/standards.ts`
- Recruiter has OID4VP request/response routes in:
  - `CredVerseRecruiter/server/routes/verification.ts`
- Wallet deep-link helpers include OID4VCI/OID4VP parsers in:
  - `BlockWalletDigi/client/src/lib/deep-linking.ts`
- Wallet receive/import/share flows in:
  - `BlockWalletDigi/server/routes/credentials.ts`
  - `BlockWalletDigi/server/routes/sharing.ts`

Implication: we should **augment adapters/conformance checks**, not replace core pipelines.

---

## Architecture Decision (selective OSS use only)

### What OSS is allowed for Track B

Use Veramo/OID4VC references **only** for:

1. Parsing/validation helpers for OID4VCI and OID4VP request/response structures
2. DID resolution and JOSE/JWT verification abstraction points
3. Conformance test vectors and interoperability fixtures

### What stays proprietary/current

1. Credential issuance business rules (tenant/template/issuer policy)
2. Risk/fraud decisioning
3. Persistence and activity/audit chain behavior
4. Existing API contracts and legacy aliases

---

## Surgical Module Plan

### New package (prototype-only)

`packages/oss-wallet-interop/`

Suggested files:

- `packages/oss-wallet-interop/package.json`
- `packages/oss-wallet-interop/src/index.ts`
- `packages/oss-wallet-interop/src/types.ts`
- `packages/oss-wallet-interop/src/oid4vci/offer-validator.ts`
- `packages/oss-wallet-interop/src/oid4vci/token-validator.ts`
- `packages/oss-wallet-interop/src/oid4vp/request-validator.ts`
- `packages/oss-wallet-interop/src/oid4vp/response-validator.ts`
- `packages/oss-wallet-interop/src/did/veramo-resolver-adapter.ts` (interface + stub)
- `packages/oss-wallet-interop/src/jose/jwt-proof-adapter.ts` (interface + stub)
- `packages/oss-wallet-interop/tests/*.test.ts`

### Integration touchpoints (small, flag-protected)

1. **Issuer**
   - `CredVerseIssuer 3/server/routes/standards.ts`
   - Insert optional pre-validation of offer/token/credential payload shapes before issuance.
2. **Recruiter**
   - `CredVerseRecruiter/server/routes/verification.ts`
   - Insert optional OID4VP response validation (nonce/state/aud/exp checks) through adapter.
3. **Wallet**
   - `BlockWalletDigi/server/routes/credentials.ts`
   - `BlockWalletDigi/client/src/lib/deep-linking.ts`
   - Optional parsing hardening and structured errors for OID4VC links.
4. **Shared contracts/config**
   - `packages/shared-auth/src/contracts.ts` (only if new error codes/contracts needed)

---

## Phased Task Plan

### Phase 0 — Guardrails (0.5 day)

- Add feature flags and no-op wiring.
- Add ADR note under `docs/` explaining selective OSS boundary.
- Exit: zero behavior change with flags off.

### Phase 1 — Standards Adapter Skeleton (1 day)

- Create `packages/oss-wallet-interop` with strict TypeScript interfaces.
- Implement pure validators for OID4VCI/OID4VP payload conformance.
- No external network calls; no key material handling yet.
- Exit: unit tests for valid/invalid vectors.

### Phase 2 — Shadow Validation Integration (1–1.5 days)

- Wire adapter in Issuer/Recruiter/Wallet under `OSS_WALLET_INTEROP_MODE=shadow`.
- Log adapter verdicts but do not block existing flow.
- Emit counters: `interop_validation_pass`, `interop_validation_fail`, reason codes.
- Exit: no regression in existing tests.

### Phase 3 — Active Mode Pilot (1 day)

- Enable blocking only in non-prod for selected endpoints.
- Enforce strict checks for malformed OID4 payloads.
- Keep instant rollback via env flag.
- Exit: conformance + integration suite green.

### Phase 4 — Hardening (optional)

- Add DID resolution caching policy and replay protections.
- Add perf budget checks under load.

---

## Risk Controls

1. **Operational risk**
   - Full feature-flag isolation; default off.
   - Shadow mode before active mode.
2. **Compatibility risk**
   - Preserve existing response schema/codes unless `OID4VC_STRICT_CONFORMANCE=true`.
3. **Security risk**
   - No private key migration into OSS layer.
   - Bound token size, alg allowlist, audience and nonce/state checks.
4. **Supply-chain risk**
   - Pin dependency versions; lockfile review.
   - Limit OSS usage to validation/resolution adapters only.
5. **Performance risk**
   - Add timeout/circuit-breaker behavior for resolver adapters.

---

## Minimal Spike Implementation Path (do now, low blast radius)

### Spike goal

Prove adapter seam and shadow verdict logging on one endpoint each:

- Issuer: `POST /api/v1/oid4vci/token`
- Recruiter: `POST /v1/oid4vp/responses`

### Spike steps

1. Create `packages/oss-wallet-interop` with:
   - `validateOid4vciTokenRequest(body)`
   - `validateOid4vpResponse(body, expectedNonce, expectedState?)`
2. In selected endpoints, call validators only when `OSS_WALLET_INTEROP_ENABLED=true`.
3. In `shadow` mode:
   - never block
   - attach diagnostics to logs (`interop.code`, `interop.reason`)
4. Add tests:
   - good payload pass
   - nonce mismatch fail
   - unsupported grant/format fail

### Expected output from spike

- Demonstrated compatibility with existing flow
- Objective error taxonomy for future strict mode
- No changes required to credential model/storage

---

## Acceptance Criteria for Track B

- [ ] Branch/prototype remains isolated from Track A releases
- [ ] All new behavior behind flags, default off
- [ ] Adapter package has unit coverage for OID4VCI/OID4VP payload checks
- [ ] Shadow mode emits structured diagnostics without blocking
- [ ] Existing test suites in wallet/issuer/recruiter continue passing

---

## Recommended Next Commit Sequence (prototype branch)

1. `chore(interop): add feature flags + ADR for selective OSS wallet boundary`
2. `feat(interop): scaffold oss-wallet-interop validator package`
3. `feat(interop): shadow-wire oid4vci token + oid4vp response validators`
4. `test(interop): add conformance vectors and regression cases`

---

## Notes for Mainline Merge Governance

- Do **not** merge active mode to release branch until:
  - shadow telemetry stable for >=48h in staging
  - no increase in verification failure false-positives
  - security review completed for dependency set

This plan starts Track B immediately while preserving Track A velocity and stability.
