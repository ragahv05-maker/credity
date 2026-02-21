# Credity S35 — ZK Option A (PRD v2.0) First 6-Hour Batch

Date: 2026-02-17
Owner: Company ORBIT-ZK
Scope lock: ZK-native Option A only (circom + snarkjs + Groth16 verifier path for Polygon zkEVM)

## 1) Implemented in this batch (repo edits completed)

### A. New Circom circuits

- `zk/circuits/lib/comparators.circom`
  - Local comparator primitives (`Num2Bits`, `LessThan`, `GreaterEq`, `LessEq`) to remove external dependency for first pass.
- `zk/circuits/score_threshold.circom`
  - PRD use case #1: prove `score > threshold`.
  - Public inputs: `threshold`, `commitment`
  - Private inputs: `score`, `salt`
- `zk/circuits/age_verification.circom`
  - PRD use case #2: prove age eligibility via `birthDate <= cutoffDate`.
  - Public inputs: `cutoffDate`, `commitment`
  - Private inputs: `birthYear`, `birthMonth`, `birthDay`, `salt`
- `zk/circuits/cross_vertical_aggregate.circom`
  - PRD use case #3: prove min vertical count + score thresholds + aggregate average.
  - Public inputs: `minVerticals`, `minScorePerVertical`, `minAverageScore`, `commitment`
  - Private inputs: `scores[5]`, `include[5]`, `salt`

### B. snarkjs integration scripts

- `zk/package.json`
  - Added scripts for circuit build, Groth16 setup, proof generation/verification, solidity verifier export.
- `zk/scripts/setup-groth16.mjs`
  - Runs Groth16 setup/contribution/export verification key for all 3 circuits.
- `zk/scripts/generate-zk-proof.mjs`
  - Wrapper for `snarkjs groth16 fullprove`.
- `zk/scripts/verify-zk-proof.mjs`
  - Wrapper for `snarkjs groth16 verify`.
- `zk/scripts/export-solidity-verifier.mjs`
  - Exports verifier Solidity contract into issuer contracts tree.

### C. Polygon zkEVM compatible verifier integration (Solidity)

- `CredVerseIssuer 3/contracts/contracts/zk/IGroth16Verifier.sol`
  - Interface compatible with Groth16 `verifyProof` tuple format.
- `CredVerseIssuer 3/contracts/contracts/zk/ReputationVerifier.sol`
  - PRD-aligned `verifyAndStoreProof(...)` pattern.
  - Stores unique proof hash, emits `ProofVerified`, supports verifier rotation with role control.
- `CredVerseIssuer 3/contracts/contracts/zk/MockGroth16Verifier.sol`
  - Test double for deterministic contract tests.

### D. Tests / quality gates

- `zk/tests/circuit-spec.test.mjs`
  - Structural tests asserting non-negotiable constraints are encoded in each circuit.
- `CredVerseIssuer 3/contracts/test/ReputationVerifier.test.js`
  - Tests proof acceptance, invalid proof rejection, duplicate proof prevention, admin rotation.
- Root script updates in `package.json`
  - `zk:test`, `zk:build`, `zk:prove`

---

## 2) Tests planned/executable for this batch

### A. Execute now (no new dependencies)

1. `cd /Users/raghav/Desktop/credity/zk && npm test`
   - Verifies circuit files + critical constraint snippets exist.
2. `cd "/Users/raghav/Desktop/credity/CredVerseIssuer 3/contracts" && npm test -- test/ReputationVerifier.test.js`
   - Verifies on-chain proof lifecycle contract behavior.

### B. Execute after toolchain availability (`circom`, `snarkjs`, ptau)

1. `cd /Users/raghav/Desktop/credity/zk && npm run build:circuits`
2. Place `powersOfTau28_hez_final_12.ptau` at:
   - `zk/artifacts/powersOfTau28_hez_final_12.ptau`
3. `npm run setup:groth16`
4. Generate sample inputs + run:
   - `node scripts/generate-zk-proof.mjs score_threshold ./fixtures/score_input.json`
   - `node scripts/verify-zk-proof.mjs score_threshold`
5. `npm run export:verifier -- score_threshold`

---

## 3) Root-cause fixes delivered in this batch

1. **No ZK implementation gap** (PRD claims vs repo state)
   - Fixed by introducing circuits + script pipeline + verifier contracts + tests.
2. **Verifier integration gap in Solidity layer**
   - Fixed via dedicated `ReputationVerifier` with Groth16-compatible ABI and dedupe storage.
3. **Missing evidence hooks for ZK path**
   - Fixed by codifying deterministic test and execution commands under `/zk` and Hardhat tests.

---

## 4) Known limitations (intentionally explicit for L3+ audit)

1. Commitments use lightweight arithmetic binding in this batch (not Poseidon yet).
2. Age circuit relies on trusted `cutoffDate` public input computation off-circuit.
3. Full cryptographic proof E2E requires local Circom/SnarkJS binary availability and ptau artifact.

These are queued for Batch-2 hardening without scope drift.

---

## 5) Next 6-hour batch plan (exact)

1. Replace arithmetic commitments with Poseidon hash constraints.
2. Add witness calculator tests with positive/negative vectors per circuit.
3. Generate real Groth16 artifacts for all 3 circuits and commit verification keys + checksums.
4. Export concrete verifier contracts from zkeys and wire in Hardhat deployment script for Polygon zkEVM target chain config.
5. Add gas snapshot evidence for `verifyAndStoreProof` using realistic public signal lengths.
