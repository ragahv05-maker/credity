import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const writeEdge = vi.fn();
const getSnapshot = vi.fn();

let selectLimitResponses: any[] = [];

const fakeDb = {
  select: () => ({
    from: () => ({
      where: () => ({
        limit: async () => selectLimitResponses.shift() ?? [],
      }),
      orderBy: () => ({
        limit: async () => selectLimitResponses.shift() ?? [],
      }),
    }),
  }),
  insert: () => ({
    values: (value: any) => ({
      returning: async () => [
        {
          id: "db-row-1",
          ...value,
          createdAt: new Date("2026-02-17T00:00:00.000Z"),
        },
      ],
    }),
  }),
};

vi.mock("../server/auth", () => ({
  apiKeyOrAuthMiddleware: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../server/db", () => ({
  getDb: () => fakeDb,
}));

vi.mock("../server/services/reputation-graph", () => ({
  createReputationGraphService: () => ({
    writeEdge,
    getSnapshot,
  }),
}));

describe("reputation route graph integration", () => {
  beforeEach(() => {
    writeEdge.mockReset();
    getSnapshot.mockReset();
    selectLimitResponses = [];
  });

  it("writes graph edge on reputation event ingestion and returns graph write status", async () => {
    const routerModule = await import("../server/routes/reputation");
    const app = express();
    app.use(express.json());
    app.use("/api/v1", routerModule.default);

    selectLimitResponses.push([]); // existing event lookup
    writeEdge.mockResolvedValue({ accepted: true });

    const payload = {
      event_id: "evt-123",
      subjectDid: "did:credverse:user:42",
      platformId: "Ride Share+",
      category: "transport",
      signalType: "positive_feedback",
      score: 81,
      occurred_at: "2026-02-17T10:00:00.000Z",
      metadata: { source: "test" },
    };

    const res = await request(app)
      .post("/api/v1/reputation/events")
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.graph).toEqual({ accepted: true });
    expect(writeEdge).toHaveBeenCalledTimes(1);
    expect(writeEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        issuerDid: "did:credverse:platform:ride-share",
        subjectDid: "did:credverse:user:42",
        edgeType: "ENDORSED",
        scoreDelta: 81,
      }),
    );
  });

  it("returns graph snapshot using graph service", async () => {
    const routerModule = await import("../server/routes/reputation");
    const app = express();
    app.use(express.json());
    app.use("/api/v1", routerModule.default);

    getSnapshot.mockResolvedValue({
      subjectDid: "did:credverse:user:42",
      totalScore: 120,
      edgeCount: 3,
      updatedAt: "2026-02-17T12:00:00.000Z",
    });

    const res = await request(app)
      .get("/api/v1/reputation/graph/snapshot")
      .query({ subjectDid: "did:credverse:user:42" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      snapshot: {
        subjectDid: "did:credverse:user:42",
        totalScore: 120,
        edgeCount: 3,
        updatedAt: "2026-02-17T12:00:00.000Z",
      },
    });

    expect(getSnapshot).toHaveBeenCalledWith({
      subjectDid: "did:credverse:user:42",
      asOf: undefined,
    });
  });

  it("returns deterministic graph fallback when write throws", async () => {
    const routerModule = await import("../server/routes/reputation");
    const app = express();
    app.use(express.json());
    app.use("/api/v1", routerModule.default);

    selectLimitResponses.push([]);
    writeEdge.mockRejectedValue(new Error("boom"));

    const res = await request(app).post("/api/v1/reputation/events").send({
      event_id: "evt-graph-fallback",
      subjectDid: "did:credverse:user:42",
      platformId: "TaxiApp",
      category: "transport",
      signalType: "verified_reference",
      score: 75,
    });

    expect(res.status).toBe(201);
    expect(res.body.graph).toEqual({
      accepted: false,
      reason: "reputation_graph_write_failed",
    });
  });

  it("returns deterministic graph fallback when snapshot read throws", async () => {
    const routerModule = await import("../server/routes/reputation");
    const app = express();
    app.use(express.json());
    app.use("/api/v1", routerModule.default);

    getSnapshot.mockRejectedValue(new Error("boom"));

    const res = await request(app)
      .get("/api/v1/reputation/graph/snapshot")
      .query({ subjectDid: "did:credverse:user:42" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      snapshot: null,
      graph: {
        accepted: false,
        reason: "reputation_graph_snapshot_failed",
      },
    });
  });
});
