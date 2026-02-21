import { describe, expect, it } from "vitest";
import {
  computeWorkScore,
  evaluateWorkScore,
  mapWorkScoreDecision,
  WORKSCORE_WEIGHTS,
} from "../server/services/workscore";

describe("workscore service", () => {
  it("sums breakdown to the final score and maxes at 1000", () => {
    const result = computeWorkScore({
      identity: 1,
      education: 1,
      employment: 1,
      reputation: 1,
      skills: 1,
      crossTrust: 1,
    });

    const sumBreakdown = Object.values(result.breakdown).reduce(
      (acc, value) => acc + value,
      0,
    );

    expect(result.score).toBe(1000);
    expect(sumBreakdown).toBe(result.score);
    expect(sumBreakdown).toBe(
      Object.values(WORKSCORE_WEIGHTS).reduce((a, b) => a + b, 0),
    );
  });

  it("maps thresholds to HIRE_FAST / REVIEW / INVESTIGATE_REJECT", () => {
    expect(mapWorkScoreDecision(850)).toBe("HIRE_FAST");
    expect(mapWorkScoreDecision(1000)).toBe("HIRE_FAST");

    expect(mapWorkScoreDecision(700)).toBe("REVIEW");
    expect(mapWorkScoreDecision(849)).toBe("REVIEW");

    expect(mapWorkScoreDecision(699)).toBe("INVESTIGATE_REJECT");
    expect(mapWorkScoreDecision(0)).toBe("INVESTIGATE_REJECT");
  });

  it("returns deterministic response and reason code filtering", () => {
    const payload = {
      components: {
        identity: 1,
        education: 0.5,
        employment: 0.5,
        reputation: 0.5,
        skills: 1,
        crossTrust: 1,
      },
      reason_codes: ["SIG_INVALID", "UNKNOWN_CODE", "CROSS_TRUST_LOW"],
      evidence: {
        summary: "manual review notes",
        anchors_checked: ["anchor-1"],
        docs_checked: ["doc-1"],
      },
    };

    const first = evaluateWorkScore(payload);
    const second = evaluateWorkScore(payload);

    expect(first).toEqual(second);
    expect(first.score).toBe(650);
    expect(first.decision).toBe("INVESTIGATE_REJECT");
    expect(first.reason_codes).toEqual(["SIG_INVALID", "CROSS_TRUST_LOW"]);
  });
});
