import { describe, expect, it } from "vitest";

import {
  buildIssuanceEvidenceMetadata,
  normalizeCredentialType,
} from "../server/services/issuance-metadata";

describe("issuance metadata helpers", () => {
  it("normalizes credential types for evidence alignment", () => {
    expect(normalizeCredentialType("UniversityDegreeCredential")).toBe(
      "university_degree_credential",
    );
    expect(normalizeCredentialType("  Employment VC  ")).toBe("employment_vc");
    expect(normalizeCredentialType("work-score/v1")).toBe("work_score_v1");
  });

  it("builds additive issuance evidence metadata with stable timestamps and deduped types", () => {
    const metadata = buildIssuanceEvidenceMetadata({
      issuerDid: "did:web:issuer.example",
      issuanceTimestamp: "2026-02-16T09:00:00.000Z",
      credentialType: "UniversityDegreeCredential",
      additionalCredentialTypes: [
        "VerifiableCredential",
        "UniversityDegreeCredential",
      ],
    });

    expect(metadata.issuerDid).toBe("did:web:issuer.example");
    expect(metadata.issuedAt).toBe("2026-02-16T09:00:00.000Z");
    expect(metadata.issuedAtUnix).toBe(1771232400);
    expect(metadata.credentialType).toBe("UniversityDegreeCredential");
    expect(metadata.credentialTypeNormalized).toBe(
      "university_degree_credential",
    );
    expect(metadata.credentialTypes).toEqual([
      "UniversityDegreeCredential",
      "VerifiableCredential",
    ]);
    expect(metadata.credentialTypesNormalized).toEqual([
      "university_degree_credential",
      "verifiable_credential",
    ]);
  });
});
