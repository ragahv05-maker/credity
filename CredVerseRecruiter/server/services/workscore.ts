import {
  WORKSCORE_REASON_CODES,
  WORKSCORE_WEIGHTS,
  type WorkScoreBreakdownMap,
  type WorkScoreComponent,
  type WorkScoreDecision,
  type WorkScoreEvaluationContract,
  type WorkScoreEvaluationRequestContract,
  type WorkScoreInput,
  type WorkScoreReasonCode,
} from "@credverse/shared-auth";

export { WORKSCORE_REASON_CODES, WORKSCORE_WEIGHTS };

export type WorkScoreBreakdown = WorkScoreBreakdownMap;
export type WorkScoreEvaluation = WorkScoreEvaluationContract;

function clampRatio(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function computeWorkScoreBreakdown(
  input: WorkScoreInput,
): WorkScoreBreakdown {
  return {
    identity: Math.round(
      WORKSCORE_WEIGHTS.identity * clampRatio(input.identity),
    ),
    education: Math.round(
      WORKSCORE_WEIGHTS.education * clampRatio(input.education),
    ),
    employment: Math.round(
      WORKSCORE_WEIGHTS.employment * clampRatio(input.employment),
    ),
    reputation: Math.round(
      WORKSCORE_WEIGHTS.reputation * clampRatio(input.reputation),
    ),
    skills: Math.round(WORKSCORE_WEIGHTS.skills * clampRatio(input.skills)),
    crossTrust: Math.round(
      WORKSCORE_WEIGHTS.crossTrust * clampRatio(input.crossTrust),
    ),
  };
}

export function computeWorkScore(input: WorkScoreInput): {
  score: number;
  breakdown: WorkScoreBreakdown;
} {
  const breakdown = computeWorkScoreBreakdown(input);
  const score = Object.values(breakdown).reduce((acc, part) => acc + part, 0);
  return { score, breakdown };
}

export function mapWorkScoreDecision(score: number): WorkScoreDecision {
  if (score >= 850) return "HIRE_FAST";
  if (score >= 700) return "REVIEW";
  return "INVESTIGATE_REJECT";
}

export function normalizeWorkScoreReasonCodes(
  reasonCodes: unknown,
): WorkScoreReasonCode[] {
  if (!Array.isArray(reasonCodes)) return [];
  return reasonCodes.filter(
    (code): code is WorkScoreReasonCode =>
      typeof code === "string" &&
      WORKSCORE_REASON_CODES.includes(code as WorkScoreReasonCode),
  );
}

export function evaluateWorkScore(
  payload: WorkScoreEvaluationRequestContract,
): WorkScoreEvaluation {
  const components = payload.components || {};
  const { score, breakdown } = computeWorkScore(components);

  const anchors_checked = Array.isArray(payload.evidence?.anchors_checked)
    ? payload.evidence?.anchors_checked.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  const docs_checked = Array.isArray(payload.evidence?.docs_checked)
    ? payload.evidence?.docs_checked.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  const summary = payload.evidence?.summary?.trim();
  if (!summary && process.env.NODE_ENV === "production") {
    throw new Error("WorkScore evidence.summary is required in production");
  }

  return {
    score,
    breakdown,
    decision: mapWorkScoreDecision(score),
    reason_codes: normalizeWorkScoreReasonCodes(payload.reason_codes),
    evidence: {
      summary: summary || "WorkScore evidence not provided",
      anchors_checked,
      docs_checked,
    },
  };
}
