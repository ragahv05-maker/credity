import { Engine } from 'json-rules-engine';
import type { VerificationResultContract } from '@credverse/shared-auth';

export type VerificationDecisionInput = {
  verificationStatus: 'verified' | 'failed' | 'suspicious' | 'pending';
  riskScore: number;
  riskFlags: string[];
  fraudScore: number;
  fraudRecommendation?: string;
  fraudFlags: string[];
  isScanned?: boolean;
};

export type VerificationDecisionPolicyResult = {
  decision: VerificationResultContract['decision'];
  reasonCodes: string[];
  matchedRules: string[];
};

const hardRejectFlags = new Set(['INVALID_SIGNATURE', 'REVOKED_CREDENTIAL', 'EXPIRED_CREDENTIAL', 'PARSE_FAILED']);
const decisionRank: Record<VerificationResultContract['decision'], number> = {
  approve: 4,
  review: 3,
  investigate: 2,
  reject: 1,
};

function clampRisk(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function baseDecision(input: VerificationDecisionInput): VerificationResultContract['decision'] {
  if (input.verificationStatus === 'failed' || input.riskFlags.some((flag) => hardRejectFlags.has(flag))) {
    return 'reject';
  }
  if (input.verificationStatus === 'suspicious' || input.riskScore >= 40 || input.fraudRecommendation === 'review') {
    return 'review';
  }
  if (input.verificationStatus === 'verified' && input.fraudRecommendation === 'accept') {
    return 'approve';
  }
  return 'investigate';
}

export async function evaluateVerificationDecisionPolicy(
  input: VerificationDecisionInput,
): Promise<VerificationDecisionPolicyResult> {
  const engine = new Engine();

  engine.addRule({
    name: 'hard-fail-signature-or-revoked',
    conditions: {
      any: [
        { fact: 'verificationStatus', operator: 'equal', value: 'failed' },
        { fact: 'hasHardRejectFlag', operator: 'equal', value: true },
      ],
    },
    event: {
      type: 'set-decision',
      params: { decision: 'reject', reason_code: 'POLICY_HARD_FAIL' },
    },
  });

  engine.addRule({
    name: 'high-fraud-score-needs-review',
    conditions: {
      any: [
        { fact: 'fraudScore', operator: 'greaterThanInclusive', value: 60 },
        { fact: 'riskScore', operator: 'greaterThanInclusive', value: 70 },
      ],
    },
    event: {
      type: 'set-decision',
      params: { decision: 'review', reason_code: 'POLICY_HIGH_FRAUD_RISK' },
    },
  });

  engine.addRule({
    name: 'scanned-credential-review-lock',
    conditions: {
      all: [
        { fact: 'isScanned', operator: 'equal', value: true },
        { fact: 'verificationStatus', operator: 'equal', value: 'verified' },
      ],
    },
    event: {
      type: 'set-decision',
      params: { decision: 'review', reason_code: 'SCANNED_CREDENTIAL_REVIEW' },
    },
  });

  let decision = baseDecision(input);
  const reasonCodes = new Set<string>([...input.riskFlags, ...input.fraudFlags]);
  const matchedRules: string[] = [];

  const almanacFacts = {
    verificationStatus: input.verificationStatus,
    riskScore: clampRisk(input.riskScore),
    fraudScore: clampRisk(input.fraudScore),
    hasHardRejectFlag: input.riskFlags.some((flag) => hardRejectFlags.has(flag)),
    isScanned: Boolean(input.isScanned),
  };

  const { events } = await engine.run(almanacFacts);
  for (const event of events) {
    if (event.type !== 'set-decision') continue;
    const nextDecision = String(event.params?.decision || '') as VerificationResultContract['decision'];
    const reasonCode = String(event.params?.reason_code || '').trim();

    if (nextDecision && decisionRank[nextDecision] < decisionRank[decision]) {
      decision = nextDecision;
    }
    if (reasonCode.length > 0) {
      reasonCodes.add(reasonCode);
    }
    if (typeof (event as any).name === 'string') {
      matchedRules.push((event as any).name);
    }
  }

  return {
    decision,
    reasonCodes: Array.from(reasonCodes).sort(),
    matchedRules,
  };
}
