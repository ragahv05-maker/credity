import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

const app = express();
app.use(express.json());
const httpServer = createServer(app);

await registerRoutes(httpServer, app);

describe("safedate route integration", () => {
  it("returns full evaluate payload shape and preserves existing success contract", async () => {
    const res = await request(app)
      .post("/api/safedate/evaluate")
      .send({
        factors: {
          profile_integrity: 1,
          identity_confidence: 1,
          social_consistency: 1,
          behavior_stability: 0,
          risk_checks: 0,
        },
        reason_codes: ["SOCIAL_MISMATCH"],
        evidence: {
          summary: "deterministic threshold case",
          signals_checked: ["signal:1"],
          checks_run: ["check:1"],
        },
      });

    expect(res.status).toBe(200);

    expect(res.body).toHaveProperty("score");
    expect(res.body).toHaveProperty("factors");
    expect(res.body).toHaveProperty("decision");
    expect(res.body).toHaveProperty("reason_codes");
    expect(res.body).toHaveProperty("evidence");
    expect(res.body).toHaveProperty("weights");

    expect(res.body.score).toBe(70);
    expect(res.body.decision).toBe("review");
    expect(res.body.factors).toEqual({
      profile_integrity: 25,
      identity_confidence: 25,
      social_consistency: 20,
      behavior_stability: 0,
      risk_checks: 0,
    });
    expect(res.body.reason_codes).toEqual(["SOCIAL_MISMATCH"]);
    expect(res.body.evidence).toEqual({
      summary: "deterministic threshold case",
      signals_checked: ["signal:1"],
      checks_run: ["check:1"],
    });
  });

  it("returns 400 when payload shape is invalid", async () => {
    const res = await request(app)
      .post("/api/safedate/evaluate")
      .send({
        factors: {
          profile_integrity: 1.1,
          unknown_factor: 0.5,
        },
        reason_codes: ["NOT_A_REAL_CODE"],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
    expect(res.body.message).toBe("Invalid SafeDate request payload");
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "factors.profile_integrity",
        }),
        expect.objectContaining({
          path: "factors",
        }),
        expect.objectContaining({
          path: "reason_codes.0",
        }),
      ]),
    );
  });
});
