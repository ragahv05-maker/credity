import { describe, expect, it } from "vitest";
import request from "supertest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

const app = express();
app.use(express.json());
const httpServer = createServer(app);
await registerRoutes(httpServer, app);

describe("issuer auth hardening", () => {
  it("does not allow self-assigned privileged role during registration", async () => {
    const username = `role_test_${Date.now()}`;
    const password = "RoleTest123!";

    const register = await request(app)
      .post("/api/v1/auth/register")
      .send({ username, password, role: "admin" });

    expect(register.status).toBe(201);
    expect(register.body.user?.role).toBe("user");

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ username, password });

    expect(login.status).toBe(200);
    expect(login.body.user?.role).toBe("user");
  });

  it("rejects 2FA verification when pending token is invalid", async () => {
    const res = await request(app).post("/api/v1/2fa/verify").send({
      userId: "some-user",
      token: "123456",
      pendingToken: "invalid-token",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/pending authentication token/i);
  });
});
