import {
  SAFEDATE_REASON_CODES,
  SAFEDATE_WEIGHTS,
  type SafeDateBreakdownMap,
  type SafeDateDecision,
  type SafeDateEvaluationContract,
  type SafeDateEvaluationRequestContract,
  type SafeDateInput,
  type SafeDateReasonCode,
} from '@credverse/shared-auth';

export { SAFEDATE_REASON_CODES, SAFEDATE_WEIGHTS };

export type SafeDateBreakdown = SafeDateBreakdownMap;
export type SafeDateEvaluation = SafeDateEvaluationContract;

function clampRatio(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function computeSafeDateBreakdown(input: SafeDateInput): SafeDateBreakdown {
  return {
    profile_integrity: Math.round(SAFEDATE_WEIGHTS.profile_integrity * clampRatio(input.profile_integrity)),
    identity_confidence: Math.round(SAFEDATE_WEIGHTS.identity_confidence * clampRatio(input.identity_confidence)),
    social_consistency: Math.round(SAFEDATE_WEIGHTS.social_consistency * clampRatio(input.social_consistency)),
    behavior_stability: Math.round(SAFEDATE_WEIGHTS.behavior_stability * clampRatio(input.behavior_stability)),
    risk_checks: Math.round(SAFEDATE_WEIGHTS.risk_checks * clampRatio(input.risk_checks)),
  };
}

export function computeSafeDateScore(input: SafeDateInput): { score: number; factors: SafeDateBreakdown } {
  const factors = computeSafeDateBreakdown(input);
  const rawScore = Object.values(factors).reduce((acc, part) => acc + part, 0);
  const score = Math.max(0, Math.min(100, rawScore));
  return { score, factors };
}

export function mapSafeDateDecision(score: number): SafeDateDecision {
  if (score >= 75) return 'safe';
  if (score >= 45) return 'review';
  return 'risky';
}

export function normalizeSafeDateReasonCodes(reasonCodes: unknown): SafeDateReasonCode[] {
  if (!Array.isArray(reasonCodes)) return [];
  return reasonCodes.filter((code): code is SafeDateReasonCode =>
    typeof code === 'string' && SAFEDATE_REASON_CODES.includes(code as SafeDateReasonCode),
  );
}

export function evaluateSafeDate(payload: SafeDateEvaluationRequestContract): SafeDateEvaluation {
  const factorsInput = payload.factors || {};
  const { score, factors } = computeSafeDateScore(factorsInput);

  const signals_checked = Array.isArray(payload.evidence?.signals_checked)
    ? payload.evidence.signals_checked.filter((item): item is string => typeof item === 'string')
    : [];

  const checks_run = Array.isArray(payload.evidence?.checks_run)
    ? payload.evidence.checks_run.filter((item): item is string => typeof item === 'string')
    : [];

  const summary = payload.evidence?.summary?.trim();
  if (!summary && process.env.NODE_ENV === 'production') {
    throw new Error('SafeDate evidence.summary is required in production');
  }

  return {
    score,
    factors,
    decision: mapSafeDateDecision(score),
    reason_codes: normalizeSafeDateReasonCodes(payload.reason_codes),
    evidence: {
      summary: summary || 'SafeDate evidence not provided',
      signals_checked,
      checks_run,
    },
  };
}
