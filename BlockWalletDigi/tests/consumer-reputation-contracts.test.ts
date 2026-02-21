import { describe, expect, it } from "vitest";
import {
  REASON_CODE_VALUES,
  toSafeDateBadgeLevel,
  type CandidateVerificationSummary,
  type SafeDateBadge,
} from "../client/src/types/reputation-contracts";

describe("consumer reputation contracts", () => {
  it("maps SafeDate score into stable badge levels", () => {
    expect(toSafeDateBadgeLevel(20)).toBe("low");
    expect(toSafeDateBadgeLevel(50)).toBe("moderate");
    expect(toSafeDateBadgeLevel(75)).toBe("high");
    expect(toSafeDateBadgeLevel(90)).toBe("elite");
  });

  it("accepts contract-shaped candidate and SafeDate payloads", () => {
    const candidate: CandidateVerificationSummary = {
      candidate_id: "candidate_1",
      decision: "approve",
      confidence: 0.93,
      risk_score: 0.11,
      reason_codes: [REASON_CODE_VALUES[0], "CUSTOM_REASON_CODE"],
      work_score: {
        score: 845,
        max_score: 1000,
        computed_at: new Date().toISOString(),
        breakdown: [
          {
            category: "employment",
            weight: 0.5,
            score: 900,
            weighted_score: 450,
            event_count: 3,
          },
        ],
      },
      evidence: [
        {
          id: "ev1",
          type: "credential",
          verified_at: new Date().toISOString(),
        },
      ],
    };

    const safeDate: SafeDateBadge = {
      user_id: 1,
      score: 82,
      badge_level: "high",
      computed_at: new Date().toISOString(),
      reason_codes: ["SAFE_DATE_HIGH_TRUST"],
      breakdown: {
        identity_verified_points: 20,
        liveness_points: 15,
        background_clean_points: 15,
        cross_platform_reputation_points: 12,
        social_validation_points: 10,
        harassment_free_points: 10,
      },
    };

    expect(candidate.work_score.max_score).toBe(1000);
    expect(safeDate.breakdown.harassment_free_points).toBeGreaterThanOrEqual(0);
  });
});
