import { beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import { createServer, type Server } from "http";
import request from "supertest";

import { registerRoutes } from "../server/routes";
import { generateAccessToken } from "../server/services/auth-service";
import { verificationEngine } from "../server/services/verification-engine";

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.`;
}

describe("oid4vp wallet-binding flow hardening", () => {
  let app: express.Express;
  let server: Server;

  const token = generateAccessToken({
    id: "1",
    username: "recruiter",
    role: "recruiter",
  });

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    app = express();
    app.use(express.json());
    server = createServer(app);
    await registerRoutes(server, app);
  });

  it("rejects missing request_id", async () => {
    const res = await request(app)
      .post("/api/v1/oid4vp/responses")
      .set("Authorization", `Bearer ${token}`)
      .send({ vp_token: makeJwt({ nonce: "n1" }) });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("request_id is required");
  });

  it("rejects nonce mismatch in vp_token binding", async () => {
    const createRes = await request(app)
      .post("/api/v1/oid4vp/requests")
      .set("Authorization", `Bearer ${token}`)
      .send({ purpose: "credential_verification", state: "state-1" });

    expect(createRes.status).toBe(201);

    const res = await request(app)
      .post("/api/v1/oid4vp/responses")
      .set("Authorization", `Bearer ${token}`)
      .send({
        request_id: createRes.body.request_id,
        state: "state-1",
        vp_token: makeJwt({ nonce: "wrong-nonce", state: "state-1" }),
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("nonce mismatch");
  });

  it("rejects state mismatch when request had state binding", async () => {
    const createRes = await request(app)
      .post("/api/v1/oid4vp/requests")
      .set("Authorization", `Bearer ${token}`)
      .send({ purpose: "credential_verification", state: "expected-state" });

    expect(createRes.status).toBe(201);

    const res = await request(app)
      .post("/api/v1/oid4vp/responses")
      .set("Authorization", `Bearer ${token}`)
      .send({
        request_id: createRes.body.request_id,
        credential: { id: "urn:cred:1" },
        state: "bad-state",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("state mismatch");
  });

  it("consumes request_id only on successful verification", async () => {
    const spy = vi
      .spyOn(verificationEngine, "verifyCredential")
      .mockResolvedValue({
        verificationId: "verif-1",
        status: "verified",
        checks: [],
        riskScore: 0,
      } as any);

    const createRes = await request(app)
      .post("/api/v1/oid4vp/requests")
      .set("Authorization", `Bearer ${token}`)
      .send({ purpose: "credential_verification", state: "ok-state" });

    const first = await request(app)
      .post("/api/v1/oid4vp/responses")
      .set("Authorization", `Bearer ${token}`)
      .send({
        request_id: createRes.body.request_id,
        state: "ok-state",
        credential: { id: "urn:cred:ok" },
      });

    expect(first.status).toBe(200);
    expect(first.body.verification_id).toBe("verif-1");

    const second = await request(app)
      .post("/api/v1/oid4vp/responses")
      .set("Authorization", `Bearer ${token}`)
      .send({
        request_id: createRes.body.request_id,
        state: "ok-state",
        credential: { id: "urn:cred:ok" },
      });

    expect(second.status).toBe(400);
    expect(second.body.error).toBe("unknown request_id");

    spy.mockRestore();
  });
});
