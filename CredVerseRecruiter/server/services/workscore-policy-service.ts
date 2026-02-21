import { Engine } from "json-rules-engine";
import type {
  WorkScoreDecision,
  WorkScoreReasonCode,
} from "@credverse/shared-auth";

type PolicyInput = {
  score: number;
  hasStrongEvidence: boolean;
  hasRiskSignals: boolean;
  candidateContext?: Record<string, unknown>;
};

export type WorkScorePolicyResult = {
  decision: WorkScoreDecision;
  reason_codes: WorkScoreReasonCode[];
  matched_rules: string[];
};

const decisionRank: Record<WorkScoreDecision, number> = {
  HIRE_FAST: 3,
  REVIEW: 2,
  INVESTIGATE_REJECT: 1,
};

const baseDecisionFromScore = (score: number): WorkScoreDecision => {
  if (score >= 850) return "HIRE_FAST";
  if (score >= 700) return "REVIEW";
  return "INVESTIGATE_REJECT";
};

export async function evaluateWorkScorePolicy(
  input: PolicyInput,
): Promise<WorkScorePolicyResult> {
  const engine = new Engine();

  engine.addRule({
    name: "force-review-when-evidence-weak",
    conditions: {
      all: [
        { fact: "hasStrongEvidence", operator: "equal", value: false },
        { fact: "score", operator: "greaterThanInclusive", value: 700 },
      ],
    },
    event: {
      type: "set-decision",
      params: { decision: "REVIEW", reason_code: "DATA_SPARSITY" },
    },
  });

  engine.addRule({
    name: "force-investigate-on-risk",
    conditions: {
      all: [{ fact: "hasRiskSignals", operator: "equal", value: true }],
    },
    event: {
      type: "set-decision",
      params: {
        decision: "INVESTIGATE_REJECT",
        reason_code: "CROSS_TRUST_LOW",
      },
    },
  });

  const baseDecision = baseDecisionFromScore(input.score);
  let decision = baseDecision;
  const reasonCodes = new Set<WorkScoreReasonCode>();
  const matchedRules: string[] = [];

  const { events } = await engine.run({
    score: input.score,
    hasStrongEvidence: input.hasStrongEvidence,
    hasRiskSignals: input.hasRiskSignals,
    candidateContext: input.candidateContext || {},
  });

  for (const event of events) {
    if (event.type !== "set-decision") continue;
    const eventDecision = String(
      event.params?.decision || "",
    ) as WorkScoreDecision;
    const reasonCode = String(
      event.params?.reason_code || "",
    ) as WorkScoreReasonCode;
    if (decisionRank[eventDecision] < decisionRank[decision]) {
      decision = eventDecision;
    }
    if (reasonCode) {
      reasonCodes.add(reasonCode);
    }
    matchedRules.push(String(event.type));
  }

  return {
    decision,
    reason_codes: Array.from(reasonCodes),
    matched_rules: matchedRules,
  };
}
