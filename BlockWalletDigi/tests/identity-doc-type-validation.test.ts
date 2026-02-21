import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import identityRoutes from "../server/routes/identity";

describe("identity document type validation", () => {
  it("accepts each supported document type with normalization", async () => {
    const app = express();
    app.use(express.json({ limit: "2mb" }));
    app.use("/api/v1/identity", identityRoutes);

    const cases = [
      { type: "aadhaar", documentNumber: "234567890123" },
      { type: "pan", documentNumber: "abcde1234f" },
      { type: "passport", documentNumber: "k1234567" },
      { type: "dl", documentNumber: "mh1220150012345" },
    ];

    for (const item of cases) {
      const res = await request(app)
        .post("/api/v1/identity/document/validate-type")
        .send(item);

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.normalizedType).toBeTruthy();
      expect(res.body.normalizedDocumentNumber).toBeTruthy();
    }
  });

  it("rejects malformed and unsupported document payloads", async () => {
    const app = express();
    app.use(express.json({ limit: "2mb" }));
    app.use("/api/v1/identity", identityRoutes);

    const invalidAadhaar = await request(app)
      .post("/api/v1/identity/document/validate-type")
      .send({ type: "aadhaar", documentNumber: "111111111111" });
    expect(invalidAadhaar.status).toBe(400);
    expect(invalidAadhaar.body.valid).toBe(false);

    const unsupportedType = await request(app)
      .post("/api/v1/identity/document/validate-type")
      .send({ type: "voter-id", documentNumber: "ABCD1234" });
    expect(unsupportedType.status).toBe(400);
    expect(unsupportedType.body.valid).toBe(false);
  });
});
