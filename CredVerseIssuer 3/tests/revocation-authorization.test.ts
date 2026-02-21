import { describe, expect, it } from "vitest";
import request from "supertest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";
import { storage } from "../server/storage";

const app = express();
app.use(express.json());
const httpServer = createServer(app);
await registerRoutes(httpServer, app);

async function loginAsViewer() {
  const username = `revoke_user_${Date.now()}`;
  const password = "RevokeUser123!";
  const tenantId = "550e8400-e29b-41d4-a716-446655440000";

  const register = await request(app)
    .post("/api/v1/auth/register")
    .send({ username, password, role: "user", tenantId });
  expect(register.status).toBe(201);

  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ username, password });
  expect(login.status).toBe(200);

  return { token: login.body?.tokens?.accessToken as string, tenantId };
}

describe("revocation authorization hardening", () => {
  it("blocks revocation for non-issuer JWT role with explicit code", async () => {
    const { token, tenantId } = await loginAsViewer();

    const credential = await storage.createCredential({
      tenantId,
      templateId: "template-1",
      issuerId: "issuer-1",
      recipient: { did: "did:example:abc" },
      credentialData: { name: "Test Holder" },
      vcJwt: "jwt",
    } as any);

    const res = await request(app)
      .post(`/api/v1/credentials/${credential.id}/revoke`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "security_test" });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ISSUER_FORBIDDEN");
  });
});
