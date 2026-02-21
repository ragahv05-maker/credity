import { describe, expect, it } from "vitest";
import { createClaimsPersistence } from "../server/services/claims-persistence";

class FakeStateStore<T> {
  state: T | null = null;
  async load(): Promise<T | null> {
    return this.state;
  }
  async save(next: T): Promise<void> {
    this.state = structuredClone(next);
  }
}

describe("claims persistence durability", () => {
  it("persists claim and evidence across repository instances", async () => {
    const stateStore = new FakeStateStore<any>();
    const repoA = createClaimsPersistence(stateStore as any);

    await repoA.saveClaim({
      id: "claim_1",
      claimantUserId: "u1",
      platformId: null,
      claimType: "identity_check",
      claimAmount: null,
      description: "test claim",
      timeline: [],
      evidenceIds: [],
      identityScore: 80,
      integrityScore: 70,
      authenticityScore: 90,
      trustScore: 80,
      recommendation: "review",
      redFlags: [],
      aiAnalysis: {
        deepfakeDetected: false,
        deepfakeVerdict: "unknown",
        deepfakeConfidence: null,
        timelineConsistent: true,
        fraudPatternMatch: 0,
        llmConfidence: 0.8,
      },
      processingTimeMs: 10,
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    });

    await repoA.saveEvidence({
      id: "e1",
      userId: "u1",
      claimId: "claim_1",
      mediaType: "image",
      storageUrl: "https://example.com/a.jpg",
      authenticityScore: 88,
      isAiGenerated: false,
      manipulationDetected: false,
      metadata: {},
      blockchainHash: "0xabc",
      analysisData: { ok: true },
      uploadedAt: new Date().toISOString(),
      analyzedAt: new Date().toISOString(),
    });

    const repoB = createClaimsPersistence(stateStore as any);
    const claim = await repoB.getClaim("claim_1");
    const evidence = await repoB.getEvidence("e1");

    expect(claim).toBeTruthy();
    expect(claim?.evidenceIds).toContain("e1");
    expect(evidence?.claimId).toBe("claim_1");
  });
});
