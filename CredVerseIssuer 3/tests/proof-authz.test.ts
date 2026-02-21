import { describe, expect, it } from "vitest";
import request from "supertest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";
import { deterministicHash } from "../server/services/proof-lifecycle";

const app = express();
app.use(express.json());
const httpServer = createServer(app);
await registerRoutes(httpServer, app);

async function loginAs(role: string): Promise<string> {
  const username = `proof_${role}_${Date.now()}`;
  const password = "ProofAuth123!";

  const register = await request(app)
    .post("/api/v1/auth/register")
    .send({
      username,
      password,
      role,
      tenantId: "550e8400-e29b-41d4-a716-446655440000",
    });
  expect(register.status).toBe(201);

  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ username, password });
  expect(login.status).toBe(200);

  return login.body?.tokens?.accessToken as string;
}

describe("issuer proof route authz", () => {
  it("returns explicit unauthorized code when missing credentials", async () => {
    const res = await request(app)
      .post("/api/v1/proofs/generate")
      .send({ credential_id: "cred_missing", format: "sd-jwt-vc" });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("AUTH_UNAUTHORIZED");
  });

  it("returns explicit forbidden code for non-issuer JWT role", async () => {
    const token = await loginAs("user");

    const res = await request(app)
      .post("/api/v1/proofs/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({ credential_id: "cred_missing", format: "sd-jwt-vc" });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("PROOF_FORBIDDEN");
  });

  it("allows authorized API key flow to reach business validation", async () => {
    const res = await request(app)
      .post("/api/v1/proofs/generate")
      .set("X-API-Key", "test-api-key")
      .send({ credential_id: "cred_missing", format: "sd-jwt-vc" });

    expect(res.status).toBe(404);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("fails closed with explicit integration requirement for unsupported runtime formats", async () => {
    const res = await request(app)
      .post("/api/v1/proofs/generate")
      .set("X-API-Key", "test-api-key")
      .send({ subject_did: "did:key:holder-1", format: "sd-jwt-vc" });

    expect(res.status).toBe(501);
    expect(res.body.status).toBe("unsupported");
    expect(res.body.code).toBe("PROOF_INTEGRATION_REQUIRED");
    expect(res.body.integration_required).toBe(true);
    expect(String(res.body.reason || "")).toContain(
      "requires a production prover integration",
    );
  });

  it("rejects invalid proof formats instead of coercing to fallback formats", async () => {
    const res = await request(app)
      .post("/api/v1/proofs/generate")
      .set("X-API-Key", "test-api-key")
      .send({
        subject_did: "did:key:holder-1",
        format: "unknown-proof-format",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("PROOF_FORMAT_INVALID");
    expect(Array.isArray(res.body.allowed_formats)).toBe(true);
    expect(res.body.allowed_formats).toContain("ldp_vc");
  });

  it("verifies merkle-membership proof using strict deterministic checks", async () => {
    const claims = {
      credentialSubject: { id: "did:key:holder-verify", score: 88 },
    };
    const claimsDigest = deterministicHash(claims, "sha256", "RFC8785-V1");
    const leafHash = deterministicHash(
      {
        credential_id: "cred-verify-route",
        claims_digest: claimsDigest,
        nonce: "nonce-verify-route",
      },
      "sha256",
      "RFC8785-V1",
    );

    const proof = {
      type: "credity.merkle-membership-proof/v1",
      verification_contract: "credity-proof-verification/v1",
      canonicalization: "RFC8785-V1",
      hash_algorithm: "sha256",
      issued_at: new Date().toISOString(),
      credential_id: "cred-verify-route",
      issuer_did: "did:key:issuer-verify",
      subject_did: "did:key:holder-verify",
      challenge: "challenge-verify-route",
      domain: "recruiter.credity.example",
      nonce: "nonce-verify-route",
      claims_digest: claimsDigest,
      leaf_hash: leafHash,
      verification_endpoint:
        "https://issuer.credity.example/api/v1/proofs/verify",
      zk_hook: null,
    };

    const res = await request(app).post("/api/v1/proofs/verify").send({
      format: "merkle-membership",
      proof,
      challenge: "challenge-verify-route",
      domain: "recruiter.credity.example",
      expected_issuer_did: "did:key:issuer-verify",
      expected_subject_did: "did:key:holder-verify",
      expected_claims: claims,
    });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe("PROOF_VERIFIED");
    expect(res.body.valid).toBe(true);
  });

  it("fails closed on verify for unsupported runtime formats", async () => {
    const res = await request(app)
      .post("/api/v1/proofs/verify")
      .send({ format: "sd-jwt-vc", proof: { any: "value" } });

    expect(res.status).toBe(501);
    expect(res.body.code).toBe("PROOF_INTEGRATION_REQUIRED");
    expect(res.body.integration_required).toBe(true);
  });

  it("rejects invalid merkle proof schema on verify endpoint", async () => {
    const res = await request(app)
      .post("/api/v1/proofs/verify")
      .send({ format: "merkle-membership", proof: { type: "invalid" } });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("PROOF_VERIFICATION_FAILED");
    expect(res.body.reason_codes).toContain("PROOF_SCHEMA_INVALID");
  });
});
