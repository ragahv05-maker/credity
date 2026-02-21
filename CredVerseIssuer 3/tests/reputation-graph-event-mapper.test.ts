import { describe, expect, it } from "vitest";
import {
  mapPlatformToIssuerDid,
  mapReputationEventToGraphEdge,
  mapScoreToGraphDelta,
  mapSignalTypeToGraphEdgeType,
} from "../server/services/reputation-graph-event-mapper";

describe("reputation graph event mapper", () => {
  it("maps did platform ids directly", () => {
    expect(mapPlatformToIssuerDid("did:credverse:platform:ledger")).toBe(
      "did:credverse:platform:ledger",
    );
  });

  it("maps external platform ids to deterministic credverse did", () => {
    expect(mapPlatformToIssuerDid("Uber-India Main")).toBe(
      "did:credverse:platform:uber-india-main",
    );
  });

  it("classifies negative signals as revoked and produces negative score delta", () => {
    const edgeType = mapSignalTypeToGraphEdgeType("fraud_report");
    expect(edgeType).toBe("REVOKED");
    expect(mapScoreToGraphDelta(87, edgeType)).toBe(-87);
  });

  it("classifies endorsement and verification signals", () => {
    expect(mapSignalTypeToGraphEdgeType("verified_reference")).toBe("ENDORSED");
    expect(mapSignalTypeToGraphEdgeType("kyc_verified")).toBe("VERIFIED");
  });

  it("builds a graph edge payload with context and normalized did", () => {
    const edge = mapReputationEventToGraphEdge({
      eventId: "evt-1",
      subjectDid: "did:credverse:user:123",
      platformId: "Ride Share+",
      category: "transport",
      signalType: "endorsement",
      score: 73,
      occurredAt: "2026-02-17T12:00:00.000Z",
    });

    expect(edge).toEqual({
      issuerDid: "did:credverse:platform:ride-share",
      subjectDid: "did:credverse:user:123",
      edgeType: "ENDORSED",
      scoreDelta: 73,
      occurredAt: "2026-02-17T12:00:00.000Z",
      context: {
        eventId: "evt-1",
        platformId: "Ride Share+",
        category: "transport",
        signalType: "endorsement",
      },
    });
  });
});
