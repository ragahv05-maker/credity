import { describe, expect, it } from "vitest";

import {
  ISSUER_TRUST_DECISION,
  WORKSCORE_TRUST_REASON_CODES,
  isWorkScoreTrustReasonCode,
  mapIssuerTrustStatusToDecision,
} from "../server/domain/workscore-trust";

describe("workscore trust domain", () => {
  it("maps issuer trust statuses into decision enum", () => {
    expect(mapIssuerTrustStatusToDecision("trusted")).toBe(
      ISSUER_TRUST_DECISION.TRUSTED,
    );
    expect(mapIssuerTrustStatusToDecision("revoked")).toBe(
      ISSUER_TRUST_DECISION.REVOKED,
    );
    expect(mapIssuerTrustStatusToDecision("pending")).toBe(
      ISSUER_TRUST_DECISION.REVIEW,
    );
    expect(mapIssuerTrustStatusToDecision(undefined)).toBe(
      ISSUER_TRUST_DECISION.REVIEW,
    );
  });

  it("exposes guarded reason codes for downstream scoring scaffolding", () => {
    expect(
      isWorkScoreTrustReasonCode(WORKSCORE_TRUST_REASON_CODES.VERIFIED_DOMAIN),
    ).toBe(true);
    expect(
      isWorkScoreTrustReasonCode(
        WORKSCORE_TRUST_REASON_CODES.MANUAL_REVIEW_REQUIRED,
      ),
    ).toBe(true);
    expect(isWorkScoreTrustReasonCode("unknown_reason")).toBe(false);
  });
});
