import { describe, expect, it, vi } from "vitest";
import {
  getReputationPreviewData,
  mockReputationPreviewPayload,
} from "../client/src/lib/reputation-preview-data";

describe("reputation preview live fallback", () => {
  it("keeps current mock behavior when live flag is off", async () => {
    const fetchSpy = vi.fn();

    const result = await getReputationPreviewData({
      liveModeEnabled: false,
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });

    expect(result.source).toBe("mock");
    expect(result.error).toBeUndefined();
    expect(result.payload).toEqual(mockReputationPreviewPayload);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to mock payload when live API call fails", async () => {
    const fetchStub = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await getReputationPreviewData({
      liveModeEnabled: true,
      fetchImpl: fetchStub as unknown as typeof fetch,
    });

    expect(fetchStub).toHaveBeenCalled();
    expect(result.source).toBe("mock");
    expect(result.payload).toEqual(mockReputationPreviewPayload);
    expect(result.error).toContain("network down");
  });

  it("uses backend candidate summary contract directly (no client heuristic mapping)", async () => {
    const backendCandidate = {
      candidate_id: "candidate_wallet_user_42",
      decision: "investigate",
      confidence: 0.67,
      risk_score: 0.33,
      reason_codes: ["BACKGROUND_FLAGS_PRESENT"],
      work_score: {
        score: 670,
        max_score: 1000,
        computed_at: new Date().toISOString(),
        breakdown: [
          {
            category: "employment",
            weight: 0.2,
            score: 70,
            weighted_score: 140,
            event_count: 2,
          },
        ],
      },
      evidence: [],
    };

    const fetchStub = vi.fn(async (input: any) => {
      const url = String(input);
      if (url.includes("/api/reputation/summary")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            candidate_summary: backendCandidate,
          }),
        } as Response;
      }
      if (url.includes("/api/reputation/safedate")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            safe_date: {
              user_id: 42,
              score: 61,
              computed_at: new Date().toISOString(),
              reason_codes: ["SAFE_DATE_MONITOR"],
              breakdown: {
                identity_verified_points: 20,
                liveness_points: 15,
                background_clean_points: 10,
                cross_platform_reputation_points: 8,
                social_validation_points: 4,
                harassment_free_points: 4,
              },
            },
          }),
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await getReputationPreviewData({
      liveModeEnabled: true,
      userId: 42,
      fetchImpl: fetchStub as unknown as typeof fetch,
    });

    expect(fetchStub).toHaveBeenCalledTimes(2);
    expect(result.source).toBe("live");
    expect(result.payload.candidate).toEqual(backendCandidate);
    expect(result.payload.safeDate.badge_level).toBe("moderate");
  });
});
