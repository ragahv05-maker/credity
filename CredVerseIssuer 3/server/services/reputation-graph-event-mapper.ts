import type {
  ReputationEdgeType,
  ReputationEdgeWriteInput,
} from "./reputation-graph";

interface ReputationEventGraphInput {
  eventId: string;
  subjectDid: string;
  platformId: string;
  category: string;
  signalType: string;
  score: number;
  occurredAt?: string;
}

const NEGATIVE_SIGNAL_HINTS = [
  "fraud",
  "chargeback",
  "abuse",
  "harassment",
  "ban",
  "revoke",
  "criminal",
  "flag",
  "suspend",
];

const ENDORSEMENT_SIGNAL_HINTS = [
  "endorse",
  "reference",
  "positive_feedback",
  "recommend",
  "testimonial",
];

const VERIFICATION_SIGNAL_HINTS = [
  "verify",
  "kyc",
  "liveness",
  "identity",
  "attest",
];

function normalizeSignal(signalType: string): string {
  return signalType.trim().toLowerCase();
}

function matchesAny(hints: string[], signal: string): boolean {
  return hints.some((hint) => signal.includes(hint));
}

function sanitizePlatformId(platformId: string): string {
  return platformId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function mapSignalTypeToGraphEdgeType(
  signalType: string,
): ReputationEdgeType {
  const normalized = normalizeSignal(signalType);

  if (matchesAny(NEGATIVE_SIGNAL_HINTS, normalized)) return "REVOKED";
  if (matchesAny(ENDORSEMENT_SIGNAL_HINTS, normalized)) return "ENDORSED";
  if (matchesAny(VERIFICATION_SIGNAL_HINTS, normalized)) return "VERIFIED";

  return "ISSUED";
}

export function mapScoreToGraphDelta(
  score: number,
  edgeType: ReputationEdgeType,
): number {
  const bounded = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  if (edgeType === "REVOKED") return -bounded;
  return bounded;
}

export function mapPlatformToIssuerDid(platformId: string): string {
  if (platformId.startsWith("did:")) {
    return platformId;
  }

  const normalized = sanitizePlatformId(platformId);
  return `did:credverse:platform:${normalized || "unknown"}`;
}

export function mapReputationEventToGraphEdge(
  input: ReputationEventGraphInput,
): ReputationEdgeWriteInput {
  const edgeType = mapSignalTypeToGraphEdgeType(input.signalType);

  return {
    issuerDid: mapPlatformToIssuerDid(input.platformId),
    subjectDid: input.subjectDid,
    edgeType,
    scoreDelta: mapScoreToGraphDelta(input.score, edgeType),
    occurredAt: input.occurredAt,
    context: {
      eventId: input.eventId,
      platformId: input.platformId,
      category: input.category,
      signalType: input.signalType,
    },
  };
}
