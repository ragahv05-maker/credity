export const REASON_CODE_VALUES = [
  "IDENTITY_VERIFIED",
  "IDENTITY_MISSING_VERIFIED_HUMAN",
  "WORK_HISTORY_VERIFIED",
  "SKILL_PROOF_VERIFIED",
  "SAFE_DATE_HIGH_TRUST",
  "SAFE_DATE_MONITOR",
  "EVIDENCE_METADATA_INCONSISTENT",
  "EVIDENCE_DEEPFAKE_DETECTED",
  "MANUAL_REVIEW_REQUIRED",
] as const;

export type KnownReasonCode = (typeof REASON_CODE_VALUES)[number];

/**
 * Keep compatibility with backend/shared contracts by allowing custom reason codes,
 * while still giving autocomplete for common values.
 */
export type ReasonCode = KnownReasonCode | (string & {});

export type VerificationDecision =
  | "approve"
  | "review"
  | "investigate"
  | "reject";

export interface WorkScoreBreakdown {
  category: string;
  weight: number;
  score: number;
  weighted_score: number;
  event_count: number;
}

export interface VerificationEvidence {
  id: string;
  type:
    | "credential"
    | "document"
    | "biometric"
    | "reputation_event"
    | "external_check";
  issuer?: string;
  uri?: string;
  hash?: string;
  verified_at?: string;
  metadata?: Record<string, unknown>;
}

export interface CandidateVerificationSummary {
  candidate_id: string;
  decision: VerificationDecision;
  confidence: number;
  risk_score: number;
  reason_codes: ReasonCode[];
  work_score: {
    score: number;
    max_score: 1000;
    computed_at: string;
    breakdown: WorkScoreBreakdown[];
  };
  evidence: VerificationEvidence[];
}

export interface SafeDateBadge {
  user_id: number;
  score: number; // 0-100
  badge_level: "low" | "moderate" | "high" | "elite";
  computed_at: string;
  reason_codes: ReasonCode[];
  breakdown: {
    identity_verified_points: number;
    liveness_points: number;
    background_clean_points: number;
    cross_platform_reputation_points: number;
    social_validation_points: number;
    harassment_free_points: number;
  };
}

export function toSafeDateBadgeLevel(
  score: number,
): SafeDateBadge["badge_level"] {
  if (score >= 85) return "elite";
  if (score >= 70) return "high";
  if (score >= 50) return "moderate";
  return "low";
}
