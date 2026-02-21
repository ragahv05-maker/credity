# NOVA Trust Interop Compatibility Matrix — 2026-02-18

## Scope

- `@credverse/trust` SDK contracts
- Cross-service contract flow: wallet ↔ issuer ↔ recruiter ↔ shared packages
- Interop lane: `npm run gate:nova:interop`

## Fix Applied

### Contract drift fixed

- **File:** `packages/shared-auth/src/contracts.ts`
- **Change:** Added missing proof format to canonical contract enum:
  - `ProofFormatContract`: added `'ldp_vc'`
- **Why:** Recruiter proof verification route already accepts `'ldp_vc'`, but shared contract type excluded it, creating enum/type drift across services.

---

## Compatibility Matrix

| Surface                           | Canonical Contract                                           | Wallet (BlockWalletDigi)                                    | Issuer (CredVerseIssuer 3)                                                  | Recruiter (CredVerseRecruiter)                                         | Status                                  |
| --------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| Reputation event ingestion        | `ReputationEventContract`                                    | Produces/consumes via `@credverse/trust` and local fallback | `/reputation/events` normalizes snake/camel payloads                        | N/A                                                                    | ✅ Compatible                           |
| Reputation score                  | `ReputationScoreContract`                                    | `GET /v1/reputation/score` via SDK, fallback local compute  | `/reputation/score` returns 0-1000 with category breakdown                  | Consumes summary outputs                                               | ✅ Compatible                           |
| SafeDate score                    | `SafeDateScoreContract`                                      | `GET /v1/reputation/safedate` via SDK/fallback              | `/reputation/safedate` computes contract breakdown                          | WorkScore/SafeDate routes aligned to shared-auth                       | ✅ Compatible                           |
| Candidate summary decision        | `VerificationDecision` = `approve/review/investigate/reject` | Maps scores + reason codes to contract decision             | N/A (upstream score producer)                                               | `buildCandidateSummaryContract` emits canonical decision set           | ✅ Compatible                           |
| Proof generation request/result   | `ProofGeneration*Contract`                                   | SDK `generateProof()` hits issuer `/api/v1/proofs/generate` | Supports `merkle-membership`, handles unsupported formats deterministically | N/A                                                                    | ✅ Compatible                           |
| Proof verification request/result | `ProofVerification*Contract`                                 | SDK `verifyProof()` hits recruiter `/v1/proofs/verify`      | N/A                                                                         | Accepts and validates proof contract payloads                          | ✅ Compatible                           |
| Proof format enum                 | `ProofFormatContract`                                        | Uses shared-auth via trust-sdk types                        | Uses shared-auth contracts                                                  | Accepts `sd-jwt-vc`, `jwt_vp`, `ldp_vp`, `ldp_vc`, `merkle-membership` | ✅ **Fixed drift**                      |
| Reason codes                      | `ReasonCode` (open string + known values)                    | Normalizes to uppercase tokens                              | Emits lowercase operational reason codes in reputation score/safedate       | Emits risk/reason code arrays for verification outputs                 | ✅ Compatible (by open string contract) |

---

## Verification Runs

### Interop lane

- `npm run gate:nova:interop` → **PASS**
  - trust-sdk verify contract conformance ✅
  - wallet consumer reputation contract conformance ✅
  - issuer reputation graph contract conformance ✅
  - recruiter workscore + safedate contract conformance ✅

### Type/build checks

- `npm run check` → **PASS** (shared-auth, trust-sdk, wallet, issuer, recruiter)

### Full monorepo tests

- `npm test` → **PASS**
  - wallet, issuer, recruiter, gateway, mobile, contracts, trust-sdk all green

---

## Notes

- Observed deferred/blockchain warning logs are expected in local/test mode and did not affect contract compatibility.
- No additional contract or import/export mismatches found after enum fix.
