import type {
  KnownReasonCode,
  ReasonCode,
  VerificationDecision,
  WorkScoreBreakdown,
  VerificationEvidence,
  CandidateVerificationSummary,
  SafeDateBadge,
} from "@credverse/shared-auth";

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

export function toSafeDateBadgeLevel(
  score: number,
): SafeDateBadge["badge_level"] {
  if (score >= 85) return "elite";
  if (score >= 70) return "high";
  if (score >= 50) return "moderate";
  return "low";
}

export type {
  KnownReasonCode,
  ReasonCode,
  VerificationDecision,
  WorkScoreBreakdown,
  VerificationEvidence,
  CandidateVerificationSummary,
  SafeDateBadge,
};
