import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";
import { verificationEngine } from "../server/services/verification-engine";
import { fraudDetector } from "../server/services/fraud-detector";

const app = express();
app.use(express.json());
const httpServer = createServer(app);

await registerRoutes(httpServer, app);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("candidate summary interoperability policies", () => {
  it("locks INVALID_SIGNATURE => reject", async () => {
    vi.spyOn(verificationEngine, "verifyCredential").mockResolvedValue({
      verificationId: "verif-invalid-signature",
      status: "verified",
      confidence: 92,
      checks: [
        {
          name: "Signature Validation",
          status: "failed",
          message: "Digital signature is invalid",
          details: {},
        },
      ],
      riskScore: 81,
      riskFlags: ["INVALID_SIGNATURE"],
      timestamp: new Date(),
    } as any);

    vi.spyOn(fraudDetector, "analyzeCredential").mockResolvedValue({
      score: 5,
      flags: [],
      recommendation: "approve",
      details: [],
    } as any);

    const res = await request(app)
      .post("/api/verify/instant")
      .send({
        credential: {
          issuer: "did:key:issuer:demo",
          credentialSubject: {
            id: "did:key:subject:demo",
            name: "Candidate A",
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.verification.verificationId).toBe(
      "verif-invalid-signature",
    );
    expect(res.body.candidate_summary).toBeDefined();
    expect(res.body.candidate_summary.decision).toBe("reject");
    expect(res.body.candidate_summary.reason_codes).toContain(
      "INVALID_SIGNATURE",
    );
  });

  it("locks unsigned/scanned => review even when fraud recommendation is approve", async () => {
    vi.spyOn(verificationEngine, "verifyCredential").mockResolvedValue({
      verificationId: "verif-unsigned",
      status: "verified",
      confidence: 90,
      checks: [
        {
          name: "Signature Validation",
          status: "warning",
          message: "Credential appears unsigned or scanned copy",
          details: {},
        },
      ],
      riskScore: 12,
      riskFlags: [],
      timestamp: new Date(),
    } as any);

    vi.spyOn(fraudDetector, "analyzeCredential").mockResolvedValue({
      score: 2,
      flags: [],
      recommendation: "approve",
      details: [],
    } as any);

    const res = await request(app)
      .post("/api/verify/instant")
      .send({
        credential: {
          issuer: "did:key:issuer:demo",
          credentialSubject: {
            id: "did:key:subject:demo",
            name: "Candidate B",
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.candidate_summary).toBeDefined();
    expect(res.body.candidate_summary.decision).toBe("review");
  });
});
