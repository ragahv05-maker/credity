# W3C DID/VC Conformance Harness (Credity Services)

This harness focuses on **Credity Issuer + Recruiter services** (excluding grooming-app) and validates baseline conformance signals for:

- DID handling (`did:key`, `did:web`) in verification expectations
- VC issuance contract shape over OID4VCI-like endpoints
- Verification behavior for issuer/subject DID match, revocation witness, and proof hash integrity

## Coverage

## 1) Issuer conformance tests

File: `CredVerseIssuer 3/tests/w3c-oid4vci-issuance-conformance.test.ts`

Checks:

- `GET /.well-known/openid-credential-issuer` exposes:
  - `credential_issuer`
  - `token_endpoint`
  - `credential_endpoint`
  - supported formats: `vc+jwt`, `sd-jwt-vc`
- Pre-authorized credential offer flow:
  - `POST /api/v1/oid4vci/credential-offers`
  - `POST /api/v1/oid4vci/token`
  - `POST /api/v1/oid4vci/credential`
- Returned credential artifact includes:
  - `format`
  - `credential_id`
  - JWT-like `credential`
  - status list metadata
- Unsupported grant type returns `unsupported_grant_type`

## 2) Recruiter verification conformance tests

Files:

- `CredVerseRecruiter/tests/w3c-did-vc-conformance.test.ts`
- `CredVerseRecruiter/tests/fixtures/w3c-did-vc-conformance-vectors.ts`

Vector-driven checks:

- Positive DID vectors (`did:key`, `did:web`) pass verification
- Malformed DID input is rejected at schema layer (`PROOF_INPUT_INVALID`)
- Issuer DID mismatch (`ISSUER_DID_MISMATCH`)
- Subject DID mismatch (`SUBJECT_DID_MISMATCH`)
- Revoked witness (`REVOKED_CREDENTIAL`)
- Deterministic metadata hash and proof verification binding

## Run

From repo root:

```bash
cd "CredVerseIssuer 3" && npm test -- --run tests/w3c-oid4vci-issuance-conformance.test.ts
cd "../CredVerseRecruiter" && npm test -- --run tests/w3c-did-vc-conformance.test.ts
```

## Notes / Limits

- This harness validates **service-level contract and behavior conformance**, not full cryptographic proof-suite interop against external W3C test suites.
- DID resolution here reflects current supported methods and API behavior (`did:key`, `did:web`) and should be extended as full DID Document method resolution hardens.
