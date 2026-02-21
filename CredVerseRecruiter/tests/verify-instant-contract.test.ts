import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

const app = express();
app.use(express.json());
const httpServer = createServer(app);

await registerRoutes(httpServer, app);

describe("recruiter instant verify contract adapter", () => {
  it("returns reason_codes + risk_signals + evidence_links (wallet-style) for UI compatibility", async () => {
    const res = await request(app)
      .post("/api/verify/instant")
      .send({
        credential: {
          // intentionally minimal/unverifiable so we deterministically get flags
          issuer: "did:key:issuer:demo",
          credentialSubject: { id: "did:key:subject:demo", name: "Demo User" },
          issuanceDate: new Date(Date.now() - 1000 * 60).toISOString(),
          expirationDate: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        },
        verifiedBy: "contract-test",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(Array.isArray(res.body.reason_codes)).toBe(true);
    expect(res.body.risk_signals_version).toBe("risk-v1");
    expect(Array.isArray(res.body.risk_signals)).toBe(true);
    expect(Array.isArray(res.body.evidence_links)).toBe(true);

    expect(res.body.candidate_summary).toBeDefined();
    expect(typeof res.body.candidate_summary.candidate_id).toBe("string");
    expect(["approve", "review", "investigate", "reject"]).toContain(
      res.body.candidate_summary.decision,
    );
    expect(Array.isArray(res.body.candidate_summary.reason_codes)).toBe(true);

    // v1 adapter mirror
    expect(Array.isArray(res.body.v1.reason_codes)).toBe(true);
    expect(res.body.v1.risk_signals_version).toBe("risk-v1");
    expect(Array.isArray(res.body.v1.risk_signals)).toBe(true);
    expect(Array.isArray(res.body.v1.evidence_links)).toBe(true);

    // Candidate summary contract for wallet/issuer interoperability
    expect(res.body.candidate_summary).toBeDefined();
    expect(typeof res.body.candidate_summary.candidate_id).toBe("string");
    expect(["approve", "review", "investigate", "reject"]).toContain(
      res.body.candidate_summary.decision,
    );
    expect(typeof res.body.candidate_summary.confidence).toBe("number");
    expect(typeof res.body.candidate_summary.risk_score).toBe("number");
    expect(Array.isArray(res.body.candidate_summary.reason_codes)).toBe(true);
    expect(typeof res.body.candidate_summary.work_score?.score).toBe("number");

    // Each risk signal normalized shape
    for (const signal of res.body.risk_signals) {
      expect(typeof signal.id).toBe("string");
      expect(typeof signal.score).toBe("number");
      expect(["info", "low", "medium", "high"]).toContain(signal.severity);
      expect(["rules", "ai", "provider"]).toContain(signal.source);
      expect(Array.isArray(signal.reason_codes)).toBe(true);
    }
  });
});
