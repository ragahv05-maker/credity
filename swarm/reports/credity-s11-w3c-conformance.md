# Credity S11 — W3C DID/VC Conformance Harness Expansion

## Scope completed

Implemented and validated W3C DID/VC conformance harness expansion for **Credity services** (Issuer + Recruiter), explicitly excluding grooming-app.

## What was added

### 1) Issuance conformance test harness (Issuer)

- **New test:** `CredVerseIssuer 3/tests/w3c-oid4vci-issuance-conformance.test.ts`
- Covers OID4VCI-aligned issuance surface:
  - `GET /.well-known/openid-credential-issuer`
  - `POST /api/v1/oid4vci/credential-offers`
  - `POST /api/v1/oid4vci/token`
  - `POST /api/v1/oid4vci/credential`
- Verifies:
  - Supported formats include `vc+jwt` and `sd-jwt-vc`
  - Pre-authorized code flow works end-to-end
  - Credential artifact and status-list metadata are returned
  - Unsupported grant type is rejected (`unsupported_grant_type`)

### 2) Verification conformance harness (Recruiter)

- **New vectors:** `CredVerseRecruiter/tests/fixtures/w3c-did-vc-conformance-vectors.ts`
- **New test:** `CredVerseRecruiter/tests/w3c-did-vc-conformance.test.ts`
- Vector-driven checks validate:
  - DID-positive flows for `did:key` and `did:web`
  - DID schema rejection for malformed DID input (`PROOF_INPUT_INVALID`)
  - Issuer DID mismatch (`ISSUER_DID_MISMATCH`)
  - Subject DID mismatch (`SUBJECT_DID_MISMATCH`)
  - Revocation witness semantics (`REVOKED_CREDENTIAL`)
  - Metadata hash + verification binding path via `/api/v1/proofs/metadata` and `/api/v1/proofs/verify`

### 3) Harness documentation

- **New doc:** `docs/compliance/w3c-did-vc-conformance-harness.md`
- Includes:
  - What is covered
  - Test file locations
  - Commands to execute
  - Current limits and next-step hardening guidance

## Validation run (executed)

### Issuer harness

```bash
cd "CredVerseIssuer 3" && npm test -- --run tests/w3c-oid4vci-issuance-conformance.test.ts
```

Result: **PASS** (3/3 tests)

### Recruiter harness

```bash
cd "CredVerseRecruiter" && npm test -- --run tests/w3c-did-vc-conformance.test.ts
```

Result: **PASS** (6/6 tests)

## Notes

- Tests currently validate **service contract and behavior conformance** for DID/VC handling and OID4VCI/OID-style flows.
- Full external cryptographic suite interoperability (e.g., expanded proof suite checks across third-party W3C vectors) remains future work as underlying proof adapters mature.
