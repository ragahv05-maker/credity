export const WORKSCORE_TRUST_REASON_CODES = {
  VERIFIED_DOMAIN: "verified_domain",
  VERIFIED_DID_CONTROL: "verified_did_control",
  ACTIVE_ISSUANCE_HISTORY: "active_issuance_history",
  ANOMALOUS_ISSUANCE_PATTERN: "anomalous_issuance_pattern",
  SANCTIONED_OR_BLOCKLISTED: "sanctioned_or_blocklisted",
  MANUAL_REVIEW_REQUIRED: "manual_review_required",
  POLICY_OVERRIDE: "policy_override",
} as const;

export type WorkScoreTrustReasonCode =
  (typeof WORKSCORE_TRUST_REASON_CODES)[keyof typeof WORKSCORE_TRUST_REASON_CODES];

export const ISSUER_TRUST_DECISION = {
  TRUSTED: "trusted",
  REVIEW: "review",
  REVOKED: "revoked",
} as const;

export type IssuerTrustDecision =
  (typeof ISSUER_TRUST_DECISION)[keyof typeof ISSUER_TRUST_DECISION];

export function mapIssuerTrustStatusToDecision(
  trustStatus: string | null | undefined,
): IssuerTrustDecision {
  switch ((trustStatus ?? "").toLowerCase()) {
    case "trusted":
      return ISSUER_TRUST_DECISION.TRUSTED;
    case "revoked":
      return ISSUER_TRUST_DECISION.REVOKED;
    default:
      return ISSUER_TRUST_DECISION.REVIEW;
  }
}

export function isWorkScoreTrustReasonCode(
  value: unknown,
): value is WorkScoreTrustReasonCode {
  return (
    typeof value === "string" &&
    Object.values(WORKSCORE_TRUST_REASON_CODES).includes(
      value as WorkScoreTrustReasonCode,
    )
  );
}
