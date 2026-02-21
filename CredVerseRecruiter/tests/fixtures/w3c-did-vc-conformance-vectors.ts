export type ProofVector = {
  id: string;
  format: "ldp_vp" | "jwt_vp" | "sd-jwt-vc" | "merkle-membership";
  proof: Record<string, unknown>;
  expectedIssuerDid?: string;
  expectedSubjectDid?: string;
  revoked?: boolean;
  expectValid: boolean;
  expectedCode: string;
  expectedReasonCodes?: string[];
};

export const proofVectors: ProofVector[] = [
  {
    id: "vc-did-key-happy-path",
    format: "ldp_vp",
    proof: {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", "UniversityDegreeCredential"],
      issuer: {
        id: "did:key:z6MkwQpL8kJQx8xXqgY9J7xvQ2YwKq4f8WQWQCLxZ3L4mAbC",
      },
      credentialSubject: {
        id: "did:key:z6Mkj8S5M8H6ZC8Fv6nQxR9f4VhQm2B1Y3U2r8k6r5S4Y3E",
        degree: "B.Tech",
      },
      issuanceDate: "2026-02-14T00:00:00.000Z",
    },
    expectedIssuerDid:
      "did:key:z6MkwQpL8kJQx8xXqgY9J7xvQ2YwKq4f8WQWQCLxZ3L4mAbC",
    expectedSubjectDid:
      "did:key:z6Mkj8S5M8H6ZC8Fv6nQxR9f4VhQm2B1Y3U2r8k6r5S4Y3E",
    expectValid: true,
    expectedCode: "PROOF_VALID",
  },
  {
    id: "vc-did-web-happy-path",
    format: "ldp_vp",
    proof: {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", "EmploymentCredential"],
      issuer: { id: "did:web:issuer.credity.ai" },
      credentialSubject: { id: "did:web:holder.credity.ai", role: "Engineer" },
      issuanceDate: "2026-02-14T00:00:00.000Z",
    },
    expectedIssuerDid: "did:web:issuer.credity.ai",
    expectedSubjectDid: "did:web:holder.credity.ai",
    expectValid: true,
    expectedCode: "PROOF_VALID",
  },
  {
    id: "issuer-did-mismatch",
    format: "ldp_vp",
    proof: {
      issuer: { id: "did:web:issuer.credity.ai" },
      credentialSubject: { id: "did:web:holder.credity.ai" },
    },
    expectedIssuerDid: "did:web:malicious.example",
    expectValid: false,
    expectedCode: "ISSUER_DID_MISMATCH",
    expectedReasonCodes: ["ISSUER_DID_MISMATCH"],
  },
  {
    id: "subject-did-mismatch",
    format: "ldp_vp",
    proof: {
      issuer: { id: "did:web:issuer.credity.ai" },
      credentialSubject: { id: "did:web:holder.credity.ai" },
    },
    expectedSubjectDid: "did:web:someone-else.credity.ai",
    expectValid: false,
    expectedCode: "SUBJECT_DID_MISMATCH",
    expectedReasonCodes: ["SUBJECT_DID_MISMATCH"],
  },
  {
    id: "revocation-witness-revoked",
    format: "ldp_vp",
    proof: {
      issuer: {
        id: "did:key:z6MkwQpL8kJQx8xXqgY9J7xvQ2YwKq4f8WQWQCLxZ3L4mAbC",
      },
      credentialSubject: {
        id: "did:key:z6Mkj8S5M8H6ZC8Fv6nQxR9f4VhQm2B1Y3U2r8k6r5S4Y3E",
      },
    },
    revoked: true,
    expectValid: false,
    expectedCode: "REVOKED_CREDENTIAL",
    expectedReasonCodes: ["REVOKED_CREDENTIAL"],
  },
];
