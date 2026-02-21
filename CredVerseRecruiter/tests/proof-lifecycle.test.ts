import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";
import { generateAccessToken } from "../server/services/auth-service";
import {
  deterministicHash,
  deterministicHashLegacyTopLevel,
} from "../server/services/proof-lifecycle";

const app = express();
app.use(express.json());
const httpServer = createServer(app);

await registerRoutes(httpServer, app);

const token = generateAccessToken({
  id: "1",
  username: "tester",
  role: "recruiter",
});

const issuerToken = generateAccessToken({
  id: "2",
  username: "issuer-user",
  role: "issuer",
});

describe("proof lifecycle routes", () => {
  it("returns explicit unauthorized code for link verification without auth", async () => {
    const res = await request(app)
      .post("/api/verify/link")
      .send({ link: "https://example.com/credential.json" });

    expect(res.status).toBe(401);
    expect(String(res.body.error || res.body.message || "")).toMatch(
      /auth|token/i,
    );
  });

  it("returns explicit unauthorized code for metadata endpoint without auth", async () => {
    const res = await request(app)
      .post("/api/v1/proofs/metadata")
      .send({ credential: { a: 1 } });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("PROOF_AUTH_REQUIRED");
  });

  it("returns explicit forbidden code for wrong role", async () => {
    const res = await request(app)
      .post("/api/v1/proofs/metadata")
      .set("Authorization", `Bearer ${issuerToken}`)
      .send({ credential: { a: 1 } });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("PROOF_FORBIDDEN");
  });
  it("returns deterministic metadata hash", async () => {
    const credential = { a: 1, b: { y: 2, x: 1 } };
    const first = await request(app)
      .post("/api/v1/proofs/metadata")
      .set("Authorization", `Bearer ${token}`)
      .send({ credential, hash_algorithm: "sha256" });

    const second = await request(app)
      .post("/api/v1/proofs/metadata")
      .set("Authorization", `Bearer ${token}`)
      .send({
        credential: { b: { x: 1, y: 2 }, a: 1 },
        hash_algorithm: "sha256",
      });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.hash).toBe(second.body.hash);
    expect(first.body.code).toBe("PROOF_METADATA_READY");
  });

  it("fails proof verification with explicit mismatch code", async () => {
    const res = await request(app)
      .post("/api/v1/proofs/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({
        format: "ldp_vp",
        proof: { issuer: "did:key:issuer", claim: 1 },
        expected_hash:
          "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        hash_algorithm: "sha256",
      });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.reason_codes).toContain("PROOF_HASH_MISMATCH");
    expect(res.body.code).toBe("PROOF_HASH_MISMATCH");
  });

  it("accepts legacy top-level hash in verification for backward compatibility", async () => {
    const proof = {
      issuer: { id: "did:key:issuer" },
      credentialSubject: { b: 2, a: 1 },
    };
    const expectedHash = deterministicHashLegacyTopLevel(proof, "sha256");

    const res = await request(app)
      .post("/api/v1/proofs/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({
        format: "ldp_vp",
        proof,
        expected_hash: expectedHash,
        hash_algorithm: "sha256",
      });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.code).toBe("PROOF_VALID");
  });

  it("rejects invalid expected_issuer_did input", async () => {
    const res = await request(app)
      .post("/api/v1/proofs/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({
        format: "ldp_vp",
        proof: { issuer: "did:key:issuer", claim: 1 },
        expected_issuer_did: "not-a-did",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("PROOF_INPUT_INVALID");
  });

  it("blocks replay of identical proof payload", async () => {
    const payload = {
      format: "ldp_vp",
      proof: {
        issuer: "did:key:issuer:123",
        credentialSubject: { id: "did:key:subject:123" },
        claim: 1,
      },
      challenge: "hire-2026-02-14",
      domain: "credverse.example",
    };

    const first = await request(app)
      .post("/api/v1/proofs/verify")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    const second = await request(app)
      .post("/api/v1/proofs/verify")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("PROOF_REPLAY_DETECTED");
  });

  it("rejects oversized credential payload on metadata route", async () => {
    const huge = "x".repeat(140 * 1024);
    const res = await request(app)
      .post("/api/v1/proofs/metadata")
      .set("Authorization", `Bearer ${token}`)
      .send({ credential: { blob: huge }, hash_algorithm: "sha256" });

    expect([400, 413]).toContain(res.status);
    if (res.status === 400) {
      expect(res.body.code).toBe("PROOF_METADATA_INPUT_INVALID");
    }
  });
});

describe("proof lifecycle deterministic hashing", () => {
  it("is stable for nested key reordering in strict canonical mode", () => {
    const a = {
      issuer: { id: "did:key:issuer", name: "X" },
      credentialSubject: { x: 1, y: 2 },
    };
    const b = {
      credentialSubject: { y: 2, x: 1 },
      issuer: { name: "X", id: "did:key:issuer" },
    };

    expect(deterministicHash(a, "keccak256", "RFC8785-V1")).toBe(
      deterministicHash(b, "keccak256", "RFC8785-V1"),
    );
  });

  it("differentiates strict canonicalization from legacy top-level fallback for nested payloads", () => {
    const payload = {
      issuer: { id: "did:key:issuer", name: "CredVerse" },
      credentialSubject: { b: 2, a: 1 },
      evidence: [
        { id: "e2", score: 2 },
        { score: 1, id: "e1" },
      ],
    };

    const strict = deterministicHash(payload, "sha256", "RFC8785-V1");
    const legacy = deterministicHashLegacyTopLevel(payload, "sha256");

    expect(strict).not.toBe(legacy);
  });

  it("rejects unsupported values in strict canonical mode", () => {
    expect(() =>
      deterministicHash({ bad: Number.NaN }, "sha256", "RFC8785-V1"),
    ).toThrow(/Non-finite numbers/i);
    expect(() =>
      deterministicHash(
        { when: new Date("2026-02-14T00:00:00.000Z") },
        "sha256",
        "RFC8785-V1",
      ),
    ).toThrow(/plain JSON objects/i);
  });

  it("allows legacy canonicalization mode for historical compatibility", () => {
    const payload = { bad: Number.NaN };
    expect(() =>
      deterministicHash(payload, "sha256", "JCS-LIKE-V1"),
    ).not.toThrow();
  });
});
