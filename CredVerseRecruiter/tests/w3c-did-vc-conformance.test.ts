import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createServer } from "http";

import { registerRoutes } from "../server/routes";
import { generateAccessToken } from "../server/services/auth-service";
import { proofVectors } from "./fixtures/w3c-did-vc-conformance-vectors";

const app = express();
app.use(express.json());
const httpServer = createServer(app);
await registerRoutes(httpServer, app);

const token = generateAccessToken({
  id: "w3c-recruiter",
  username: "w3c-recruiter",
  role: "recruiter",
});

describe("W3C DID/VC verification conformance harness", () => {
  it("rejects malformed expected DID inputs at schema boundary", async () => {
    const res = await request(app)
      .post("/api/v1/proofs/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({
        format: "ldp_vp",
        proof: {
          issuer: { id: "did:web:issuer.credity.ai" },
          credentialSubject: { id: "did:web:holder.credity.ai" },
        },
        expected_issuer_did: "not-a-did",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("PROOF_INPUT_INVALID");
  });

  for (const vector of proofVectors) {
    it(`evaluates vector: ${vector.id}`, async () => {
      const metadata = await request(app)
        .post("/api/v1/proofs/metadata")
        .set("Authorization", `Bearer ${token}`)
        .send({ credential: vector.proof, hash_algorithm: "sha256" });

      expect(metadata.status).toBe(200);
      expect(metadata.body.hash).toMatch(/^[a-f0-9]{64}$/i);

      const verifyRes = await request(app)
        .post("/api/v1/proofs/verify")
        .set("Authorization", `Bearer ${token}`)
        .send({
          format: vector.format,
          proof: vector.proof,
          expected_hash: metadata.body.hash,
          hash_algorithm: "sha256",
          expected_issuer_did: vector.expectedIssuerDid,
          expected_subject_did: vector.expectedSubjectDid,
          revocation_witness:
            typeof vector.revoked === "boolean"
              ? { credential_id: `cred-${vector.id}`, revoked: vector.revoked }
              : undefined,
        });

      expect(verifyRes.status).toBe(200);
      expect(Boolean(verifyRes.body.valid)).toBe(vector.expectValid);
      expect(verifyRes.body.code).toBe(vector.expectedCode);

      if (vector.expectedReasonCodes?.length) {
        for (const code of vector.expectedReasonCodes) {
          expect(verifyRes.body.reason_codes).toContain(code);
        }
      }
    });
  }
});
