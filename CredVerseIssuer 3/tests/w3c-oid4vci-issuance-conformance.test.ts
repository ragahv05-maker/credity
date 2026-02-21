import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createServer } from "http";

import { registerRoutes } from "../server/routes";

const app = express();
app.use(express.json());
const httpServer = createServer(app);
await registerRoutes(httpServer, app);

const ISSUER_API_KEY = process.env.ISSUER_BOOTSTRAP_API_KEY || "test-api-key";

describe("W3C VC issuance conformance harness (OID4VCI surface)", () => {
  it("exposes standards metadata for vc+jwt and sd-jwt-vc formats", async () => {
    const res = await request(app).get("/.well-known/openid-credential-issuer");

    expect(res.status).toBe(200);
    expect(res.body.credential_issuer).toMatch(/\/api\/v1\/oid4vci$/);
    expect(res.body.token_endpoint).toMatch(/\/api\/v1\/oid4vci\/token$/);
    expect(res.body.credential_endpoint).toMatch(
      /\/api\/v1\/oid4vci\/credential$/,
    );

    const supported = res.body.credential_configurations_supported || {};
    expect(supported.credity_identity_v1?.format).toBe("vc+jwt");
    expect(supported.credity_identity_sdjwt_v1?.format).toBe("sd-jwt-vc");
  });

  it("supports pre-authorized code flow and returns a credential artifact", async () => {
    const offer = await request(app)
      .post("/api/v1/oid4vci/credential-offers")
      .set("X-API-Key", ISSUER_API_KEY)
      .send({
        templateId: "template-1",
        issuerId: "issuer-1",
        recipient: {
          name: "W3C Candidate",
          email: `w3c-${Date.now()}@example.com`,
          studentId: `W3C-${Date.now()}`,
        },
        credentialData: {
          credentialName: "UniversityDegreeCredential",
          degree: "B.Tech",
        },
        format: "vc+jwt",
      });

    expect(offer.status).toBe(201);
    const preAuthCode =
      offer.body?.credential_offer?.grants?.[
        "urn:ietf:params:oauth:grant-type:pre-authorized_code"
      ]?.["pre-authorized_code"];
    expect(typeof preAuthCode).toBe("string");

    const tokenRes = await request(app).post("/api/v1/oid4vci/token").send({
      grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
      "pre-authorized_code": preAuthCode,
    });

    expect(tokenRes.status).toBe(200);
    expect(typeof tokenRes.body.access_token).toBe("string");

    const credentialRes = await request(app)
      .post("/api/v1/oid4vci/credential")
      .set("Authorization", `Bearer ${tokenRes.body.access_token}`)
      .send({});

    expect(credentialRes.status).toBe(200);
    expect(["vc+jwt", "sd-jwt-vc"]).toContain(credentialRes.body.format);
    expect(typeof credentialRes.body.credential_id).toBe("string");
    expect(typeof credentialRes.body.credential).toBe("string");
    expect(
      String(credentialRes.body.credential).split(".").length,
    ).toBeGreaterThanOrEqual(3);
    expect(typeof credentialRes.body.status?.status_list_id).toBe("string");
  });

  it("rejects unsupported token grant_type", async () => {
    const res = await request(app)
      .post("/api/v1/oid4vci/token")
      .send({ grant_type: "authorization_code" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("unsupported_grant_type");
  });
});
