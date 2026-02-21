# Credity S35 — ZK Option A Batch-2 (ORBIT lane)

Date: 2026-02-17
Scope: production verifier wiring rigor + artifact workflow robustness + evidence updates (score_threshold / age_verification / cross_vertical_aggregate)

## Changed implementation

### 1) Production verifier wiring rigor

- `CredVerseIssuer 3/contracts/contracts/zk/ReputationVerifier.sol`
  - Replaced single verifier pointer with per-circuit verifier mapping:
    - circuit 1 → score_threshold
    - circuit 2 → age_verification
    - circuit 3 → cross_vertical_aggregate
  - Added strict circuit-id validation and public-signal length validation per circuit.
  - Added admin setters:
    - `setCircuitVerifier(circuitId, verifierAddress)`
    - `setExpectedPublicSignalsLength(circuitId, newLength)`
  - Added explicit custom errors for circuit/signal mismatch hard-fail behavior.

- `CredVerseIssuer 3/contracts/scripts/deploy-reputation-verifier.js`
  - New deployment script requiring explicit verifier addresses via env:
    - `ZK_VERIFIER_SCORE_THRESHOLD`
    - `ZK_VERIFIER_AGE_VERIFICATION`
    - `ZK_VERIFIER_CROSS_VERTICAL_AGGREGATE`
  - Preserves zkEVM mainnet safety gate (`ENABLE_ZKEVM_MAINNET=true`).

- `CredVerseIssuer 3/contracts/test/ReputationVerifier.test.js`
  - Expanded tests for routing-by-circuit, unsupported circuit guardrails, and public signal length mismatches.

### 2) Artifact workflow robustness

- `zk/scripts/setup-groth16.mjs`
  - Added required-precondition checks (`ptau`, per-circuit `r1cs`).
  - Added artifact checksum manifest generation:
    - `zk/artifacts/manifest.groth16.json`
  - Manifest includes SHA-256 for `ptau`, each `r1cs`, `final.zkey`, and `verification_key.json`.

- `zk/scripts/validate-artifacts.mjs` (new)
  - Validates presence + checksum integrity against manifest.

- `zk/scripts/export-solidity-verifier.mjs`
  - Added circuit allowlist enforcement.
  - Added prechecks for zkey + manifest existence.
  - Maintains generated verifier index at:
    - `CredVerseIssuer 3/contracts/contracts/zk/generated-verifiers.json`

- `zk/package.json`
  - Added scripts:
    - `artifacts:validate`
    - `export:verifier:all`

### 3) Evidence target coverage (PRD use cases)

- score_threshold: enforced in circuitId mapping + expected public signal length = 3
- age_verification: enforced in circuitId mapping + expected public signal length = 3
- cross_vertical_aggregate: enforced in circuitId mapping + expected public signal length = 5

## 4) Execution evidence (targeted zk + contract checks)

Executed on: 2026-02-17

- `cd /Users/raghav/Desktop/credity/zk && npm test`
  - PASS (`4/4` tests)
  - Confirms structural/constraint coverage for:
    - `score_threshold`
    - `age_verification`
    - `cross_vertical_aggregate`

- `cd "/Users/raghav/Desktop/credity/CredVerseIssuer 3/contracts" && npm run test:reputation`
  - PASS (`7/7` tests)
  - Confirms production verifier wiring guards:
    - circuit routing by `circuitId`
    - unsupported circuit rejection
    - public signal length mismatch hard-fail
    - admin-only verifier rotation

- `cd /Users/raghav/Desktop/credity/zk && npm run artifacts:validate`
  - FAIL (expected precondition guard)
  - Error: missing `zk/artifacts/manifest.groth16.json`
  - Evidence of robust fail-fast artifact workflow when manifest is absent.

- `cd /Users/raghav/Desktop/credity/zk && npm run setup:groth16`
  - FAIL (expected precondition guard)
  - Error: missing `zk/artifacts/powersOfTau28_hez_final_12.ptau`
  - Evidence of strict trusted-setup prerequisite enforcement.
