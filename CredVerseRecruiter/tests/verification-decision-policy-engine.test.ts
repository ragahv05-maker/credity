import { describe, expect, it } from "vitest";
import { evaluateVerificationDecisionPolicy } from "../server/services/verification-decision-policy";

describe("verification decision policy engine (json-rules-engine)", () => {
  it("keeps hard-fail flags on reject with policy reason code", async () => {
    const result = await evaluateVerificationDecisionPolicy({
      verificationStatus: "verified",
      riskScore: 20,
      riskFlags: ["INVALID_SIGNATURE"],
      fraudScore: 2,
      fraudRecommendation: "accept",
      fraudFlags: [],
      isScanned: false,
    });

    expect(result.decision).toBe("reject");
    expect(result.reasonCodes).toContain("INVALID_SIGNATURE");
    expect(result.reasonCodes).toContain("POLICY_HARD_FAIL");
  });

  it("forces review for scanned credential in verified lane", async () => {
    const result = await evaluateVerificationDecisionPolicy({
      verificationStatus: "verified",
      riskScore: 8,
      riskFlags: [],
      fraudScore: 1,
      fraudRecommendation: "accept",
      fraudFlags: [],
      isScanned: true,
    });

    expect(result.decision).toBe("review");
    expect(result.reasonCodes).toContain("SCANNED_CREDENTIAL_REVIEW");
  });

  it("adds high-fraud policy reason code on elevated fraud scores", async () => {
    const result = await evaluateVerificationDecisionPolicy({
      verificationStatus: "verified",
      riskScore: 22,
      riskFlags: ["UNVERIFIED_ISSUER"],
      fraudScore: 67,
      fraudRecommendation: "review",
      fraudFlags: ["AI_SYNTHETIC_PATTERN"],
      isScanned: false,
    });

    expect(result.decision).toBe("review");
    expect(result.reasonCodes).toContain("POLICY_HIGH_FRAUD_RISK");
    expect(result.reasonCodes).toContain("AI_SYNTHETIC_PATTERN");
    expect(result.reasonCodes).toContain("UNVERIFIED_ISSUER");
  });
});
