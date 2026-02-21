import { describe, expect, it } from "vitest";
import {
  computeSafeDateScore,
  evaluateSafeDate,
  mapSafeDateDecision,
  SAFEDATE_WEIGHTS,
} from "../server/services/safedate";

describe("safedate service", () => {
  it("keeps score bounded between 0 and 100", () => {
    const max = computeSafeDateScore({
      profile_integrity: 1,
      identity_confidence: 1,
      social_consistency: 1,
      behavior_stability: 1,
      risk_checks: 1,
    });

    const min = computeSafeDateScore({
      profile_integrity: -1,
      identity_confidence: -1,
      social_consistency: -1,
      behavior_stability: -1,
      risk_checks: -1,
    });

    expect(max.score).toBe(100);
    expect(min.score).toBe(0);
    expect(Object.values(SAFEDATE_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(
      100,
    );
  });

  it("maps thresholds to safe / review / risky", () => {
    expect(mapSafeDateDecision(75)).toBe("safe");
    expect(mapSafeDateDecision(100)).toBe("safe");

    expect(mapSafeDateDecision(45)).toBe("review");
    expect(mapSafeDateDecision(74)).toBe("review");

    expect(mapSafeDateDecision(44)).toBe("risky");
    expect(mapSafeDateDecision(0)).toBe("risky");
  });

  it("returns deterministic evaluation with reason code filtering", () => {
    const payload = {
      factors: {
        profile_integrity: 1,
        identity_confidence: 0.8,
        social_consistency: 0.5,
        behavior_stability: 0.5,
        risk_checks: 1,
      },
      reason_codes: [
        "IDENTITY_LOW_CONFIDENCE",
        "UNKNOWN_CODE",
        "RISK_FLAG_PRESENT",
      ],
      evidence: {
        summary: "manual review suggested",
        signals_checked: ["profile_age", "id_document_match"],
        checks_run: ["device_fingerprint", "velocity_check"],
      },
    };

    const first = evaluateSafeDate(payload);
    const second = evaluateSafeDate(payload);

    expect(first).toEqual(second);
    expect(first.score).toBe(78);
    expect(first.decision).toBe("safe");
    expect(first.reason_codes).toEqual([
      "IDENTITY_LOW_CONFIDENCE",
      "RISK_FLAG_PRESENT",
    ]);
  });
});
