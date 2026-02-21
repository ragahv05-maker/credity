import { describe, expect, it, vi } from "vitest";
import {
  createReputationGraphService,
  parseReputationGraphConfig,
  type ReputationGraphDriver,
} from "../server/services/reputation-graph";

describe("reputation graph config and runtime behavior", () => {
  it("parses defaults and returns disabled noop behavior by default", async () => {
    const config = parseReputationGraphConfig({});

    expect(config.enabled).toBe(false);
    expect(config.uri).toBe("bolt://localhost:7687");
    expect(config.database).toBe("neo4j");

    const service = createReputationGraphService(config);
    await expect(
      service.writeEdge({
        issuerDid: "did:credity:issuer:1",
        subjectDid: "did:credity:user:1",
        edgeType: "ISSUED",
      }),
    ).resolves.toEqual({
      accepted: false,
      reason: "reputation_graph_disabled",
    });

    await expect(
      service.getSnapshot({
        subjectDid: "did:credity:user:1",
      }),
    ).resolves.toBeNull();
  });

  it("throws explicit error when enabled but required settings are missing", () => {
    expect(() =>
      parseReputationGraphConfig({
        REPUTATION_GRAPH_ENABLED: "true",
        REPUTATION_GRAPH_URI: "bolt://localhost:7687",
      }),
    ).toThrow("REPUTATION_GRAPH_PASSWORD is required");
  });

  it("logs warning when graph vars are set but feature flag is disabled", () => {
    const warn = vi.fn();
    parseReputationGraphConfig(
      {
        REPUTATION_GRAPH_ENABLED: "false",
        REPUTATION_GRAPH_URI: "bolt://localhost:7687",
      },
      { logger: { warn, error: vi.fn() } },
    );

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('REPUTATION_GRAPH_ENABLED is not "true"'),
    );
  });

  it("uses Neo4j driver path in enabled mode (write + snapshot)", async () => {
    const config = parseReputationGraphConfig({
      REPUTATION_GRAPH_ENABLED: "true",
      REPUTATION_GRAPH_URI: "bolt://localhost:7687",
      REPUTATION_GRAPH_USERNAME: "neo4j",
      REPUTATION_GRAPH_PASSWORD: "local-only-password",
      REPUTATION_GRAPH_DATABASE: "neo4j",
    });

    const run = vi
      .fn()
      .mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => (key === "edgeId" ? "edge-1" : null),
          },
        ],
      })
      .mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              if (key === "exists") return true;
              if (key === "totalScore") return 42;
              if (key === "edgeCount") return 2;
              if (key === "updatedAt") return "2026-02-17T00:00:00.000Z";
              return null;
            },
          },
        ],
      });

    const close = vi.fn().mockResolvedValue(undefined);
    const session = { run, close };
    const driver: ReputationGraphDriver = {
      session: vi.fn(() => session),
    };

    const service = createReputationGraphService(config, { driver });

    await expect(
      service.writeEdge({
        issuerDid: "did:credity:issuer:1",
        subjectDid: "did:credity:user:1",
        edgeType: "VERIFIED",
        scoreDelta: 21,
        context: { source: "test" },
      }),
    ).resolves.toEqual({ accepted: true });

    await expect(
      service.getSnapshot({ subjectDid: "did:credity:user:1" }),
    ).resolves.toEqual({
      subjectDid: "did:credity:user:1",
      totalScore: 42,
      edgeCount: 2,
      updatedAt: "2026-02-17T00:00:00.000Z",
    });

    expect(driver.session).toHaveBeenCalledWith({ database: "neo4j" });
    expect(run).toHaveBeenCalledTimes(2);
    expect(String(run.mock.calls[0]?.[0] || "")).toContain("REPUTATION_EDGE");
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("returns deterministic unavailable reason when driver factory yields null", async () => {
    const config = parseReputationGraphConfig({
      REPUTATION_GRAPH_ENABLED: "true",
      REPUTATION_GRAPH_URI: "bolt://localhost:7687",
      REPUTATION_GRAPH_USERNAME: "neo4j",
      REPUTATION_GRAPH_PASSWORD: "local-only-password",
      REPUTATION_GRAPH_DATABASE: "neo4j",
    });

    const service = createReputationGraphService(config, {
      driverFactory: async () => null,
    });

    await expect(
      service.writeEdge({
        issuerDid: "did:credity:issuer:1",
        subjectDid: "did:credity:user:1",
        edgeType: "ISSUED",
      }),
    ).resolves.toEqual({
      accepted: false,
      reason: "reputation_graph_driver_unavailable",
    });

    await expect(
      service.getSnapshot({ subjectDid: "did:credity:user:1" }),
    ).resolves.toBeNull();
  });
});
