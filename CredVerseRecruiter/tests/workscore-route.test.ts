import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

const app = express();
app.use(express.json());
const httpServer = createServer(app);

await registerRoutes(httpServer, app);

describe("workscore route integration", () => {
  it("returns full evaluate payload shape and honors decision threshold boundary", async () => {
    const res = await request(app)
      .post("/api/workscore/evaluate")
      .send({
        components: {
          identity: 1,
          education: 1,
          employment: 1,
          reputation: 1,
          skills: 0,
          crossTrust: 0,
        },
        reason_codes: ["SIG_INVALID"],
        evidence: {
          summary: "deterministic threshold case",
          anchors_checked: ["anchor:1"],
          docs_checked: ["doc:1"],
        },
      });

    expect(res.status).toBe(200);

    expect(res.body).toHaveProperty("score");
    expect(res.body).toHaveProperty("breakdown");
    expect(res.body).toHaveProperty("decision");
    expect(res.body).toHaveProperty("reason_codes");
    expect(res.body).toHaveProperty("evidence");
    expect(res.body).toHaveProperty("weights");

    expect(res.body.score).toBe(850);
    expect(res.body.decision).toBe("HIRE_FAST");
    expect(res.body.breakdown).toEqual({
      identity: 150,
      education: 200,
      employment: 300,
      reputation: 200,
      skills: 0,
      crossTrust: 0,
    });
    expect(res.body.evidence).toEqual({
      summary: "deterministic threshold case",
      anchors_checked: ["anchor:1"],
      docs_checked: ["doc:1"],
    });
  });

  it("returns 400 when component values are outside accepted range", async () => {
    const res = await request(app)
      .post("/api/workscore/evaluate")
      .send({
        components: {
          identity: 1.2,
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
    expect(res.body.message).toBe("Invalid WorkScore request payload");
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "components.identity",
        }),
      ]),
    );
  });

  it("returns 400 when payload shape is invalid", async () => {
    const res = await request(app)
      .post("/api/workscore/evaluate")
      .send({
        components: {
          unknown_component: 0.5,
        },
        reason_codes: ["SIG_INVALID", "NOT_A_REAL_CODE"],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "components",
        }),
        expect.objectContaining({
          path: "reason_codes.1",
        }),
      ]),
    );
  });
});
