# Upgrade Agent 6 — Fraud Policy Engine (json-rules-engine track)

## Scope completed
Implemented a modular verification decision pipeline for Recruiter fraud/verification execution lane, wired to `json-rules-engine`, with explicit reason-code propagation and tests.

## What changed

### 1) New modular policy engine service
**File:** `CredVerseRecruiter/server/services/verification-decision-policy.ts`

Added a dedicated policy evaluator:
- Uses `Engine` from `json-rules-engine`
- Input model (`VerificationDecisionInput`) combines verification status/risk + fraud outputs + scanned/unsigned signal
- Returns normalized output:
  - `decision` (`approve | review | investigate | reject`)
  - `reasonCodes` (merged + sorted)
  - `matchedRules`

Implemented rule set:
- `hard-fail-signature-or-revoked` → force `reject`, reason `POLICY_HARD_FAIL`
- `high-fraud-score-needs-review` → force `review`, reason `POLICY_HIGH_FRAUD_RISK`
- `scanned-credential-review-lock` → force `review`, reason `SCANNED_CREDENTIAL_REVIEW`

Decision severity only tightens (never upgrades to less strict outcome).

---

### 2) Upgraded execution lane in verification routes
**File:** `CredVerseRecruiter/server/routes/verification.ts`

Refactored instant verification lane (`/api/verify/instant` and `/api/v1/verifications/instant`) to use policy service.

Key additions:
- Imported and executed `evaluateVerificationDecisionPolicy(...)`
- Added normalization helpers for fraud recommendation compatibility (`approve` → `accept`)
- Added detection helper for unsigned/scanned evidence via verification checks:
  - `hasUnsignedOrScannedSignal(...)`
- Built standardized response enrichment:
  - `reason_codes`
  - `risk_signals_version: "risk-v1"`
  - `risk_signals[]` (normalized shape)
  - `evidence_links: []`
  - `candidate_summary` with decision/confidence/risk/reason codes/work score
- `v1` compatibility object in legacy route now mirrors policy decision/reason-codes/risk-signals payload
- V1 instant endpoint now includes policy metadata (`policy.matched_rules`) and the same reason-code execution-lane outputs

Also corrected issuer extraction in stored records for legacy instant path to use `readIssuer(...)`.

---

### 3) Dependency wiring
**File:** `CredVerseRecruiter/package.json` (+ lockfile)

Added direct dependency:
- `json-rules-engine`

This resolves runtime import failures for the new policy service.

---

### 4) Tests added
**New file:** `CredVerseRecruiter/tests/verification-decision-policy-engine.test.ts`

Covers:
- hard-fail flags lock to reject + policy reason code
- scanned credential lock to review
- high fraud-score policy reason-code addition

## Validation run
Executed targeted recruiter tests:
- `tests/verification-decision-policy-engine.test.ts`
- `tests/candidate-summary-policy.test.ts`
- `tests/verify-instant-policy-locks.test.ts`

Result: all passed.

## Notes for main agent
- The route payload now consistently emits policy-enriched reason codes and candidate summary fields expected by existing interoperability tests.
- Network-dependent issuer/revocation lookups still log `ECONNREFUSED` in local isolated tests, but assertions pass (existing behavior).
