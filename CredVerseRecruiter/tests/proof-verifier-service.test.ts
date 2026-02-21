import { describe, expect, it } from "vitest";
import { verifyProofContract } from "../server/services/proof-verifier-service";
import { deterministicHash } from "../server/services/proof-lifecycle";

describe("recruiter proof-verifier-service", () => {
  it("verifies merkle-membership proof envelope", async () => {
    const leafHash = deterministicHash(
      { credential_id: "cred-1", claims_digest: "abc123", nonce: null },
      "sha256",
      "RFC8785-V1",
    );

    const res = await verifyProofContract({
      format: "merkle-membership",
      proof: {
        type: "credity.merkle-membership-proof/v1",
        credential_id: "cred-1",
        claims_digest: "abc123",
        nonce: null,
        challenge: "ch-1",
        domain: "recruiter.credity.example",
        issuer_did: "did:key:issuer-1",
        subject_did: "did:key:subject-1",
        leaf_hash: leafHash,
      },
      challenge: "ch-1",
      domain: "recruiter.credity.example",
    });

    expect(res.valid).toBe(true);
    expect(res.code).toBe("PROOF_VALID");
  });

  it("returns mismatch reason when challenge does not match", async () => {
    const res = await verifyProofContract({
      format: "merkle-membership",
      proof: {
        credential_id: "cred-2",
        claims_digest: "abc123",
        nonce: null,
        challenge: "expected-ch",
        domain: "recruiter.credity.example",
        issuer_did: "did:key:issuer-1",
        subject_did: "did:key:subject-1",
        leaf_hash: "wrong",
      },
      challenge: "different-ch",
      domain: "recruiter.credity.example",
    });

    expect(res.valid).toBe(false);
    expect(res.reason_codes).toContain("PROOF_CHALLENGE_MISMATCH");
  });
});
