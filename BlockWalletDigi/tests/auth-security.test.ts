import express from "express";
import { beforeEach, describe, expect, it } from "vitest";
import authRoutes from "../server/routes/auth";
import { storage } from "../server/storage";

async function withServer<T>(
  handler: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const app = express();
  app.use(express.json());
  app.use("/api", authRoutes);

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind auth test server");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    return await handler(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe("wallet auth security", () => {
  beforeEach(() => {
    (storage as any).users?.clear?.();
  });

  it("rejects incorrect passwords for registered users", async () => {
    await withServer(async (baseUrl) => {
      const register = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "secure_user",
          password: "StrongPass1!",
          email: "secure@example.com",
        }),
      });
      expect(register.status).toBe(201);

      const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "secure_user",
          password: "WrongPass1!",
        }),
      });
      expect(badLogin.status).toBe(401);
      const badBody = (await badLogin.json()) as { error?: string };
      expect(badBody.error).toBe("Invalid credentials");

      const goodLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "secure_user",
          password: "StrongPass1!",
        }),
      });
      expect(goodLogin.status).toBe(200);
      const goodBody = (await goodLogin.json()) as {
        tokens?: { accessToken?: string };
      };
      expect(goodBody.tokens?.accessToken).toBeDefined();
    });
  });
});
