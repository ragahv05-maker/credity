import express from "express";
import { beforeEach, describe, expect, it } from "vitest";
import authRoutes from "../server/routes/auth";
import walletRoutes from "../server/routes/wallet";
import complianceRoutes from "../server/routes/compliance";
import { storage } from "../server/storage";
import { resetWalletServiceStoreForTests } from "../server/services/wallet-service";

async function withServer<T>(
  handler: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const app = express();
  app.use(express.json());
  app.use("/api", authRoutes);
  app.use("/api", walletRoutes);
  app.use("/api", complianceRoutes);

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server");
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

async function registerAndLogin(
  baseUrl: string,
  username: string,
): Promise<{ token: string; userId: number }> {
  const password = "StrongPass1!";

  const register = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  expect(register.status).toBe(201);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  expect(login.status).toBe(200);
  const body = (await login.json()) as {
    tokens?: { accessToken?: string };
    user?: { id?: number };
  };

  expect(body.tokens?.accessToken).toBeTruthy();
  expect(body.user?.id).toBeTruthy();

  return {
    token: body.tokens!.accessToken!,
    userId: body.user!.id!,
  };
}

describe("wallet route hardening", () => {
  beforeEach(() => {
    (storage as any).users?.clear?.();
    (storage as any).credentials?.clear?.();
    (storage as any).activities?.clear?.();
    resetWalletServiceStoreForTests();
  });

  it("requires auth for wallet status endpoint", async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/wallet/status`);
      expect(response.status).toBe(401);
    });
  });

  it("returns 403 on authenticated userId mismatch in compliance routes", async () => {
    await withServer(async (baseUrl) => {
      const user = await registerAndLogin(baseUrl, `wm_${Date.now()}`);

      const response = await fetch(
        `${baseUrl}/api/compliance/consents?userId=${user.userId + 1}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const body = (await response.json()) as { code?: string };
      expect(body.code).toBe("AUTH_USER_MISMATCH");
    });
  });
});
