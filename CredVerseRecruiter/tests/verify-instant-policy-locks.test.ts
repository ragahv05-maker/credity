import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

const app = express();
app.use(express.json());
const httpServer = createServer(app);

await registerRoutes(httpServer, app);

describe("recruiter verify instant locked decision policies", () => {
  it("keeps INVALID_SIGNATURE credentials on FAIL path when signature object exists but issuer is invalid", async () => {
    const res = await request(app)
      .post("/api/verify/instant")
      .send({
        credential: {
          issuer: "issuer-without-did",
          proof: { type: "Ed25519Signature2020" },
          credentialSubject: {
            id: "did:key:subject:policy-1",
            name: "Policy User 1",
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.reason_codes).toContain("INVALID_SIGNATURE");
    expect(res.body.v1.decision).toBe("reject");
    expect(res.body.candidate_summary.decision).toBe("reject");
  });

  it("keeps unsigned/scanned credentials on REVIEW path", async () => {
    const res = await request(app)
      .post("/api/verify/instant")
      .send({
        credential: {
          issuer: "did:key:issuer:policy-review",
          proof: { type: "Ed25519Signature2020", proofValue: "demo-signature" },
          scanned: true,
          credentialSubject: {
            id: "did:key:subject:policy-2",
            name: "Policy User 2",
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.v1.decision).toBe("review");
    expect(res.body.candidate_summary.decision).toBe("review");
  });
});
