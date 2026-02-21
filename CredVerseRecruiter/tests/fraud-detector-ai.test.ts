import { afterEach, describe, expect, it } from "vitest";
import { analyzeCredentialAnomalyRisk } from "../server/services/ai-anomaly-adapter";
import { fraudDetector } from "../server/services/fraud-detector";

const originalOpenAI = process.env.OPENAI_API_KEY;
const originalGemini = process.env.GEMINI_API_KEY;
const originalDeepseek = process.env.DEEPSEEK_API_KEY;

function clearProviderEnv(): void {
  delete process.env.OPENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
}

afterEach(() => {
  if (originalOpenAI) process.env.OPENAI_API_KEY = originalOpenAI;
  else delete process.env.OPENAI_API_KEY;

  if (originalGemini) process.env.GEMINI_API_KEY = originalGemini;
  else delete process.env.GEMINI_API_KEY;

  if (originalDeepseek) process.env.DEEPSEEK_API_KEY = originalDeepseek;
  else delete process.env.DEEPSEEK_API_KEY;
});

describe("ai anomaly adapter + fraud detector hybrid mode", () => {
  it("falls back to deterministic anomaly scoring when AI providers are not configured", async () => {
    clearProviderEnv();

    const result = await analyzeCredentialAnomalyRisk({
      credential: {
        issuer: "did:key:issuer-1",
        type: ["VerifiableCredential", "DegreeCredential"],
        credentialSubject: { id: "did:key:student-1", name: "Alice" },
      },
      ruleScore: 34,
      ruleFlags: ["UNKNOWN_ISSUER"],
    });

    expect(result.provider).toBe("deterministic");
    expect(result.version).toBe("ai-risk-v1");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("returns hybrid analysis payload with AI section and signal details", async () => {
    clearProviderEnv();

    const credential = {
      issuer: "fake-university",
      issuanceDate: new Date(Date.now() + 60_000).toISOString(),
      type: ["VerifiableCredential"],
      credentialSubject: {
        id: "did:key:student-1",
        name: "Test Demo Candidate",
      },
      degree: "sample credential payload",
    };

    const result = await fraudDetector.analyzeCredential(credential);

    expect(result.mode).toBe("hybrid-ai");
    expect(result.ai.provider).toBe("deterministic");
    expect(result.ruleScore).toBeGreaterThan(0);
    expect(result.aiScore).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(
      result.details.some((detail) => detail.check.startsWith("AI Signal ·")),
    ).toBe(true);
  });
});
