import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";
import { generateAccessToken } from "../server/services/auth-service";
import { resetWalletServiceStoreForTests } from "../server/services/wallet-service";

async function withAppServer<T>(
  handler: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const app = express();
  app.use(express.json());

  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Failed to bind app server");

  try {
    return await handler(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

async function withIssuerServer<T>(
  handler: (issuerUrl: string) => Promise<T>,
): Promise<T> {
  const app = express();
  app.get("/offer", (_req, res) => {
    res.json({
      credential: {
        id: "cred-1",
        credentialData: {
          credentialName: "Degree Credential",
          student: "Alice",
        },
      },
      proof: {
        algorithm: "sha256",
        hash: "a".repeat(64),
        __proto__: { polluted: true },
        nested: {
          constructor: { bad: true },
          ok: "safe",
        },
      },
    });
  });

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Failed to bind issuer server");

  try {
    return await handler(`http://127.0.0.1:${address.port}/offer`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

describe("credential/proof payload schema hardening", () => {
  const holderToken = generateAccessToken({
    id: 1,
    username: "holder",
    role: "holder",
  });

  beforeEach(() => {
    resetWalletServiceStoreForTests();
  });

  it("sanitizes unsafe metadata keys in claimed offer proof payload", async () => {
    await withAppServer(async (baseUrl) => {
      await withIssuerServer(async (issuerUrl) => {
        const response = await fetch(`${baseUrl}/api/v1/wallet/offer/claim`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${holderToken}`,
          },
          body: JSON.stringify({ url: issuerUrl }),
        });

        expect(response.status).toBe(200);
        const body = (await response.json()) as {
          proof?: Record<string, unknown>;
          credential?: { data?: { proof?: Record<string, unknown> } };
        };

        expect(body.proof?.hash).toBe("a".repeat(64));
        expect(
          Object.prototype.hasOwnProperty.call(
            (body.proof as any)?.nested || {},
            "constructor",
          ),
        ).toBe(false);
        expect(
          Object.prototype.hasOwnProperty.call(
            (body.credential?.data?.proof as any)?.nested || {},
            "constructor",
          ),
        ).toBe(false);
      });
    });
  });
});
