export const WORKSCORE_WEIGHTS = {
  identity: 150,
  education: 200,
  employment: 300,
  reputation: 200,
  skills: 100,
  crossTrust: 50,
} as const;

export const WORKSCORE_REASON_CODES = [
  "SIG_INVALID",
  "ISSUER_UNTRUSTED",
  "ANCHOR_MISSING",
  "DOC_EXPIRED",
  "SKILL_UNVERIFIED",
  "CROSS_TRUST_LOW",
] as const;

export type WorkScoreComponent = keyof typeof WORKSCORE_WEIGHTS;
export type WorkScoreReasonCode = (typeof WORKSCORE_REASON_CODES)[number];
export type WorkScoreDecision = "HIRE_FAST" | "REVIEW" | "INVESTIGATE_REJECT";

export type WorkScoreInput = Partial<Record<WorkScoreComponent, number>>;
export type WorkScoreBreakdownMap = Record<WorkScoreComponent, number>;

export interface WorkScoreEvidence {
  summary: string;
  anchors_checked: string[];
  docs_checked: string[];
}

export interface WorkScoreEvaluationRequestContract {
  components?: WorkScoreInput;
  reason_codes?: unknown;
  evidence?: {
    summary?: string;
    anchors_checked?: unknown;
    docs_checked?: unknown;
  };
}

export interface WorkScoreEvaluationContract {
  score: number;
  breakdown: WorkScoreBreakdownMap;
  decision: WorkScoreDecision;
  reason_codes: WorkScoreReasonCode[];
  evidence: WorkScoreEvidence;
}

export const SAFEDATE_WEIGHTS = {
  profile_integrity: 25,
  identity_confidence: 25,
  social_consistency: 20,
  behavior_stability: 15,
  risk_checks: 15,
} as const;

export const SAFEDATE_REASON_CODES = [
  "PROFILE_INCOMPLETE",
  "IDENTITY_LOW_CONFIDENCE",
  "SOCIAL_MISMATCH",
  "BEHAVIOR_VOLATILE",
  "RISK_FLAG_PRESENT",
] as const;

export type SafeDateFactor = keyof typeof SAFEDATE_WEIGHTS;
export type SafeDateReasonCode = (typeof SAFEDATE_REASON_CODES)[number];
export type SafeDateDecision = "safe" | "review" | "risky";

export type SafeDateInput = Partial<Record<SafeDateFactor, number>>;
export type SafeDateBreakdownMap = Record<SafeDateFactor, number>;

export interface SafeDateEvidence {
  summary: string;
  signals_checked: string[];
  checks_run: string[];
}

export interface SafeDateEvaluationRequestContract {
  factors?: SafeDateInput;
  reason_codes?: unknown;
  evidence?: {
    summary?: string;
    signals_checked?: unknown;
    checks_run?: unknown;
  };
}

export interface SafeDateEvaluationContract {
  score: number;
  factors: SafeDateBreakdownMap;
  decision: SafeDateDecision;
  reason_codes: SafeDateReasonCode[];
  evidence: SafeDateEvidence;
}
