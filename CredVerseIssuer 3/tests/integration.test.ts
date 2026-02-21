import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";
import { storage } from "../server/storage";
import { errorHandler } from "../server/middleware/error-handler";

// Setup app for testing
const app = express();
app.use(express.json());
const httpServer = createServer(app);

// Use top-level await if supported, or wrap in describe/beforeAll
// Vitest supports top-level await in ESM
await registerRoutes(httpServer, app);
app.use(errorHandler);

describe("Auth Integration API", () => {
  beforeEach(() => {
    // Clear storage
    (storage as any).users.clear();
  });

  it("should register a user successfully", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      username: "integration_user",
      password: "securepassword",
      role: "issuer",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe("integration_user");
  });

  it("should login successfully", async () => {
    // Register first
    await request(app)
      .post("/api/v1/auth/register")
      .send({ username: "login_user", password: "password123" });

    // Login
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "login_user", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.tokens).toBeDefined();
    expect(res.body.tokens.accessToken).toBeDefined();
  });

  it("should reject invalid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "nonexistent", password: "wrong" });

    expect(res.status).toBe(401);
  });

  it("should expose blockchain runtime status in health endpoint", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.app).toBe("issuer");
    expect(res.body.blockchain).toBeDefined();
    expect(typeof res.body.blockchain.chainNetwork).toBe("string");
    expect(typeof res.body.blockchain.writesAllowed).toBe("boolean");
    expect(typeof res.body.blockchain.chainId).toBe("number");
  });
});
