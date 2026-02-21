# ZK + W3C Foundation (First Pass, Conservative)

Date: 2026-02-14
Scope: `/CredVerseIssuer 3`, `/CredVerseRecruiter`, `/BlockWalletDigi`, `/packages/shared-auth`, `/docs/openapi`

## 1) Current Flow Mapping vs W3C DID Core + VC Data Model

### A. DID lifecycle

- **Current implementation**
  - DID usage is present (`did:key`, `did:web`) in issuance and verification flows.
  - Issuer registry lookup by DID exists (`CredVerseIssuer 3/server/routes/public.ts`, `registry.ts`).
  - Recruiter verifies issuer DID format and attempts registry resolution (`CredVerseRecruiter/server/services/verification-engine.ts`).
- **W3C DID Core alignment**
  - ✅ DID URI identifiers are used.
  - ⚠️ DID Document resolution is partial: method-level parsing/checks are present, but full DID Document retrieval + verificationMethod relationship checks are not consistently enforced.
  - ⚠️ `authentication` / `assertionMethod` relationships are not fully validated against resolved DID Docs.

### B. VC issuance and representation

- **Current implementation**
  - VC issuance supports `vc+jwt` and `sd-jwt-vc` flows via OID4VCI route surface (`CredVerseIssuer 3/server/routes/standards.ts`).
  - VC payload includes W3C context/type/credentialSubject fields in issuance service (`server/services/issuance.ts`).
  - Status list registration exists and is persisted (`status-list-service.ts`).
- **W3C VC Data Model alignment**
  - ✅ Core VC shape present (`@context`, `type`, `issuer`, `credentialSubject`).
  - ✅ Revocation/status list concept present.
  - ⚠️ Proof typing and suite metadata are mixed between JWT conventions and VC fields; not all proof metadata is normalized to VC DM style for non-JWT envelopes.
  - ⚠️ Credential status URLs and status method metadata are implementation-defined and need stricter VC DM profile documentation.

### C. Verification + trust decisioning

- **Current implementation**
  - Verification pipeline runs signature checks, issuer checks, revocation checks, blockchain anchor checks, DID-format checks.
  - V1 contract response is available (`VerificationResultContract`) and used in recruiter routes.
- **W3C alignment**
  - ✅ Verification outcome model is explicit and auditable.
  - ⚠️ Selective disclosure verification path is not exposed as a first-class proof-lifecycle API.
  - ⚠️ Revocation witness composition is available in parts (status list + anchor proof) but not unified as one contract response for verifier re-use.

### D. Reputation rail

- **Current implementation**
  - Reputation event ingestion and score computation by DID/user exists (`CredVerseIssuer 3/server/routes/reputation.ts`).
- **W3C alignment**
  - ⚠️ Reputation objects are not modeled as VC/VP artifacts yet (currently API-native records).
  - ✅ Subject DID concept is used and consistent with decentralized identity model.

---

## 2) Concrete Implementation Blueprint (Module-Level)

## Proof generation path

- **Issuer API contract**
  - `POST /api/v1/proofs/generate` in `CredVerseIssuer 3/server/routes/standards.ts`
  - Request/response shared contracts in `packages/shared-auth/src/contracts.ts`
- **Intended runtime adapter (next step)**
  - Add `CredVerseIssuer 3/server/services/proof-service.ts`
  - Interface: `generateProof(request) -> ProofGenerationResultContract`
  - Plug adapters for SD-JWT derivation and ZK backends (circom/snarkjs/plonk)

## Proof verification path

- **Verifier API contract**
  - `POST /v1/proofs/verify` in `CredVerseRecruiter/server/routes/verification.ts`
  - Uses shared contract: `ProofVerificationRequestContract` / `ProofVerificationResultContract`
- **Intended runtime adapter (next step)**
  - Add `CredVerseRecruiter/server/services/proof-verifier-service.ts`
  - Interface: `verifyProof(request) -> ProofVerificationResultContract`
  - Should call envelope-specific verifier (JWT VP / SD-JWT VC / ZK proof verifier)

## Revocation witness path

- **Unified witness endpoint**
  - `GET /api/v1/proofs/revocation-witness/:credentialId` in `CredVerseIssuer 3/server/routes/standards.ts`
  - Composes:
    - status-list witness (`status-list-service.ts`)
    - anchor inclusion proof (`anchor-batch-service.ts`)

## Selective disclosure path

- **Wallet-side selective disclosure exists**
  - `BlockWalletDigi/server/services/selective-disclosure.ts`
  - `BlockWalletDigi/server/routes/sharing.ts`
- **Bridge to verifier pipeline (first pass)**
  - Shared proof contracts now define proof format + expected claims + revocation witness for verifier re-check.

---

## 3) First-Pass Scaffolding Added (Non-Breaking)

- Added shared proof lifecycle contracts:
  - `ProofGenerationRequestContract`
  - `ProofGenerationResultContract`
  - `ProofVerificationRequestContract`
  - `ProofVerificationResultContract`
  - `RevocationWitnessContract`
  - in `packages/shared-auth/src/contracts.ts` (+ exports in `src/index.ts`)

- Added issuer proof lifecycle endpoints (scaffold):
  - `POST /api/v1/proofs/generate` (returns contract + `unsupported` status until adapter is configured)
  - `GET /api/v1/proofs/revocation-witness/:credentialId`
  - in `CredVerseIssuer 3/server/routes/standards.ts`

- Added verifier proof verification endpoint (scaffold):
  - `POST /v1/proofs/verify`
  - in `CredVerseRecruiter/server/routes/verification.ts`

- Updated OpenAPI with proof lifecycle paths + schemas:
  - `docs/openapi/v1.yaml`

---

## 4) Compliance Gaps Remaining (Actionable)

1. **DID Core full verification pipeline**
   - Enforce DID Document resolution and key relationship checks (`assertionMethod` / `authentication`) against actual DID Docs, not just DID prefix/method checks.

2. **VC DM profile hardening**
   - Normalize VC proof metadata across JWT/SD-JWT/non-JWT representations.
   - Explicitly define credentialStatus profile fields and interoperability requirements.

3. **ZK adapter implementation**
   - Current proof generation/verification endpoints are contracts + scaffolding, not full cryptographic verifier/prover integration yet.

4. **Revocation witness cryptographic attestation**
   - Witness now composes status + merkle proof, but does not yet include signed witness envelope or canonical witness hash binding for replay-safe verifier caching.

5. **Selective disclosure end-to-end handshake**
   - Wallet disclosure token exists, but explicit OID4VP-compatible selective disclosure proof request/response constraints should be hardened per verifier policy.

6. **Reputation-as-credential model**
   - Reputation remains API-native events/scores; converting reputation snapshots to VC/VP artifacts is still pending.
