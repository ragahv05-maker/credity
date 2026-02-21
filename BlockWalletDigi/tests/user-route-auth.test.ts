import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const updateUser = vi.fn();
const listActivities = vi.fn();

vi.mock("../server/storage", () => ({
  storage: {
    getUser,
    updateUser,
    listActivities,
  },
}));

vi.mock("../server/services/auth-service", () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    const idHeader = req.header("x-test-user-id");
    if (!idHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    const userId = Number(idHeader);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = {
      userId,
      username: "test-user",
      role: "holder",
      type: "access",
    };
    return next();
  },
}));

vi.mock("../shared/schema", () => ({
  insertUserSchema: {
    partial: () => ({
      safeParse: (data: unknown) => ({ success: true, data }),
    }),
  },
}));

describe("user route auth hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated profile access", async () => {
    const app = express();
    app.use(express.json());
    const { default: userRoutes } = await import("../server/routes/user");
    app.use("/api/v1", userRoutes);

    const res = await request(app).get("/api/v1/user");

    expect(res.status).toBe(401);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("uses authenticated user id for profile and activity routes", async () => {
    getUser.mockResolvedValue({ id: 42, username: "alice" });
    listActivities.mockResolvedValue([{ id: 1, userId: 42, action: "login" }]);

    const app = express();
    app.use(express.json());
    const { default: userRoutes } = await import("../server/routes/user");
    app.use("/api/v1", userRoutes);

    const userRes = await request(app)
      .get("/api/v1/user")
      .set("x-test-user-id", "42");
    expect(userRes.status).toBe(200);
    expect(getUser).toHaveBeenCalledWith(42);

    const activityRes = await request(app)
      .get("/api/v1/activity")
      .set("x-test-user-id", "42");
    expect(activityRes.status).toBe(200);
    expect(listActivities).toHaveBeenCalledWith(42);
  });

  it("updates only authenticated user profile", async () => {
    updateUser.mockResolvedValue({ id: 7, username: "bob", bio: "hi" });

    const app = express();
    app.use(express.json());
    const { default: userRoutes } = await import("../server/routes/user");
    app.use("/api/v1", userRoutes);

    const res = await request(app)
      .patch("/api/v1/user")
      .set("x-test-user-id", "7")
      .send({ bio: "hi" });

    expect(res.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith(7, { bio: "hi" });
  });
});
