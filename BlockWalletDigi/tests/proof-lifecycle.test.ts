import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";
import {
  computeDeterministicHash,
  createProofMetadata,
  verifyDeterministicProof,
} from "../server/utils/proof-lifecycle";
import { generateAccessToken } from "../server/services/auth-service";
import {
  walletService,
  resetWalletServiceStoreForTests,
} from "../server/services/wallet-service";

async function withServer<T>(
  handler: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const app = express();
  app.use(express.json());

  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);

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

describe("wallet proof lifecycle utilities", () => {
  it("creates deterministic metadata hash for equivalent payloads", () => {
    const a = { name: "Alice", nested: { year: 2024, grade: "A" } };
    const b = { nested: { grade: "A", year: 2024 }, name: "Alice" };

    const proofA = createProofMetadata(a, "sha256");
    const proofB = createProofMetadata(b, "sha256");

    expect(proofA.hash).toBe(proofB.hash);
    expect(proofA.canonicalization).toBe("RFC8785-V1");
  });

  it("keeps signing source-of-truth strict (RFC8785-V1) in generated metadata", () => {
    const payload = { top: "x", nested: { b: 2, a: 1 } };
    const proof = createProofMetadata(payload, "sha256");

    const strictVerification = verifyDeterministicProof(payload, {
      algorithm: proof.algorithm,
      hash: proof.hash,
      canonicalization: "RFC8785-V1",
    });

    expect(proof.canonicalization).toBe("RFC8785-V1");
    expect(strictVerification.valid).toBe(true);
  });

  it("falls back to legacy verification for historical hashes", () => {
    const payload = { top: "x", nested: { b: 2, a: 1 } };
    const legacyOnlyHash = computeDeterministicHash(
      payload,
      "sha256",
      "JCS-LIKE-V1",
    );

    const verification = verifyDeterministicProof(payload, {
      algorithm: "sha256",
      hash: legacyOnlyHash,
      canonicalization: "RFC8785-V1",
    });

    expect(verification.valid).toBe(true);
    expect(verification.computedHash).toBe(legacyOnlyHash);
  });

  it("detects tampering via hash mismatch", () => {
    const original = { degree: "B.Tech", score: 9.1 };
    const proof = createProofMetadata(original, "sha256");

    const verification = verifyDeterministicProof(
      { degree: "B.Tech", score: 8.8 },
      proof,
    );
    expect(verification.valid).toBe(false);
    expect(verification.computedHash).not.toBe(proof.hash);
  });
});

describe("wallet proof route authz", () => {
  const holderToken = generateAccessToken({
    id: 1,
    username: "holder",
    role: "holder",
  });
  const issuerToken = generateAccessToken({
    id: 2,
    username: "issuer",
    role: "issuer",
  });

  beforeEach(() => {
    resetWalletServiceStoreForTests();
  });

  it("returns explicit unauthorized code for generate without auth", async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/wallet/proofs/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId: "missing" }),
      });
      const body = (await response.json()) as { code?: string };

      expect(response.status).toBe(401);
      expect(body.code).toBe("PROOF_AUTH_REQUIRED");
    });
  });

  it("returns explicit forbidden code for non-holder generate", async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/wallet/proofs/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${issuerToken}`,
        },
        body: JSON.stringify({ credentialId: "missing" }),
      });
      const body = (await response.json()) as { code?: string };

      expect(response.status).toBe(403);
      expect(body.code).toBe("PROOF_FORBIDDEN");
    });
  });

  it("allows holder to generate proof", async () => {
    const stored = await walletService.storeCredential(1, {
      type: ["DegreeCredential"],
      issuer: "CredVerse University",
      data: { student: "Alice", degree: "B.Tech" },
      category: "education",
    });

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/wallet/proofs/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${holderToken}`,
        },
        body: JSON.stringify({ credentialId: stored.id }),
      });
      const body = (await response.json()) as {
        success?: boolean;
        proof?: { hash?: string };
      };

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(typeof body.proof?.hash).toBe("string");
    });
  });

  it("rejects malformed proof verify payload boundaries", async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/wallet/proofs/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${holderToken}`,
        },
        body: JSON.stringify({
          credential: ["not-an-object"],
          proof: { algorithm: "sha256", hash: "short" },
        }),
      });

      const body = (await response.json()) as {
        code?: string;
        details?: unknown;
      };
      expect(response.status).toBe(400);
      expect(body.code).toBe("PROOF_VERIFY_INPUT_INVALID");
      expect(body.details).toBeTruthy();
    });
  });
});
