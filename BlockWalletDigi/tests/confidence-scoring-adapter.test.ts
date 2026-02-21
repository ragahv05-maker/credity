import { describe, expect, it } from "vitest";
import { scoreClaimConfidence } from "../server/services/confidence-scoring-adapter";

describe("confidence scoring adapter", () => {
  const input = {
    claimType: "insurance_auto",
    claimAmount: 12000,
    description: "Vehicle damaged near signal at 10:30am, photos attached.",
    timelineCount: 2,
    evidenceCount: 1,
  };

  it("retries transient provider errors and returns provider score", async () => {
    let attempts = 0;
    const result = await scoreClaimConfidence(input, {
      retries: 2,
      timeoutMs: 50,
      provider: {
        name: "openai",
        async score() {
          attempts += 1;
          if (attempts < 3) throw new Error("fetch failed");
          return 0.91;
        },
      },
    });

    expect(attempts).toBe(3);
    expect(result.provider).toBe("openai");
    expect(result.confidence).toBeCloseTo(0.91, 5);
  });

  it("falls back deterministically when provider times out", async () => {
    const result = await scoreClaimConfidence(input, {
      retries: 0,
      timeoutMs: 10,
      provider: {
        name: "gemini",
        async score(_input, signal) {
          await new Promise((resolve, reject) => {
            signal.addEventListener("abort", () =>
              reject(new Error("abort timeout")),
            );
          });
          return 0.99;
        },
      },
    });

    const result2 = await scoreClaimConfidence(input, {
      retries: 0,
      timeoutMs: 10,
    });
    const result3 = await scoreClaimConfidence(input, {
      retries: 0,
      timeoutMs: 10,
    });

    expect(result.provider).toBe("deterministic");
    expect(result.version).toBe("confidence-v1");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result2.provider).toBe("deterministic");
    expect(result2.confidence).toBe(result3.confidence);
  });
});
