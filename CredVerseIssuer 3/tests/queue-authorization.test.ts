import { describe, expect, it } from "vitest";
import request from "supertest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";
import { errorHandler } from "../server/middleware/error-handler";

const app = express();
app.use(express.json());
const httpServer = createServer(app);
await registerRoutes(httpServer, app);
app.use(errorHandler);

async function loginAsViewer() {
  const username = `queue_user_${Date.now()}`;
  const password = "QueueUser123!";

  const register = await request(app).post("/api/v1/auth/register").send({
    username,
    password,
    role: "user",
    tenantId: "550e8400-e29b-41d4-a716-446655440000",
  });
  expect(register.status).toBe(201);

  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ username, password });
  expect(login.status).toBe(200);

  return login.body?.tokens?.accessToken as string;
}

describe("Issuer queue authorization", () => {
  it("blocks queue routes for non-issuer JWT roles", async () => {
    const token = await loginAsViewer();
    expect(typeof token).toBe("string");

    const res = await request(app)
      .get("/api/v1/queue/stats")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("QUEUE_FORBIDDEN");
  });

  it("allows queue routes with issuer API key auth", async () => {
    const res = await request(app)
      .get("/api/v1/queue/stats")
      .set("X-API-Key", "test-api-key");

    // queue can be unavailable in tests, but request must pass authorization guard
    expect([200, 503]).toContain(res.status);
  });

  it("blocks dead-letter replay for non-issuer JWT roles", async () => {
    const token = await loginAsViewer();

    const res = await request(app)
      .post("/api/v1/queue/dead-letter/entry-1/replay")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("QUEUE_FORBIDDEN");
  });
});
