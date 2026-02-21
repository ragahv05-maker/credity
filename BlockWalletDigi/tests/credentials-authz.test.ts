import express from "express";
import { beforeEach, describe, expect, it } from "vitest";
import authRoutes from "../server/routes/auth";
import credentialsRoutes from "../server/routes/credentials";
import { storage } from "../server/storage";

async function withServer<T>(
  handler: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const app = express();
  app.use(express.json());
  app.use("/api", authRoutes);
  app.use("/api", credentialsRoutes);

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
): Promise<string> {
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
  const body = (await login.json()) as { tokens?: { accessToken?: string } };
  const token = body.tokens?.accessToken;
  expect(token).toBeTruthy();
  return token as string;
}

describe("wallet credential authz", () => {
  beforeEach(() => {
    (storage as any).users?.clear?.();
    (storage as any).credentials?.clear?.();
    (storage as any).activities?.clear?.();
  });

  it("prevents cross-user credential reads (IDOR)", async () => {
    await withServer(async (baseUrl) => {
      const user1Token = await registerAndLogin(baseUrl, `u1_${Date.now()}`);
      const user2Token = await registerAndLogin(baseUrl, `u2_${Date.now()}`);

      const create = await fetch(`${baseUrl}/api/wallet/credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({
          credential: {
            type: ["VerifiableCredential", "TestCredential"],
            issuer: "Test Issuer",
            data: { claim: "value" },
          },
        }),
      });
      expect(create.status).toBe(200);
      const created = (await create.json()) as { credential?: { id?: string } };
      const credentialId = created.credential?.id;
      expect(credentialId).toBeTruthy();

      const readByUser2 = await fetch(
        `${baseUrl}/api/wallet/credentials/${credentialId}`,
        {
          headers: {
            Authorization: `Bearer ${user2Token}`,
          },
        },
      );

      expect(readByUser2.status).toBe(404);
    });
  });
});
