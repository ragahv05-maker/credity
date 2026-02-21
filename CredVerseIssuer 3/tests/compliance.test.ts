import { describe, expect, it } from "vitest";
import request from "supertest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";
import { errorHandler } from "../server/middleware/error-handler";

const app = express();
app.use(express.json());
const httpServer = createServer(app);
await registerRoutes(httpServer, app);
app.use(errorHandler);

const ISSUER_API_KEY = "test-api-key";

describe("Issuer compliance API", () => {
  it("supports consent lifecycle and hash-chained audit export", async () => {
    const subjectId = `subject_${Date.now()}`;

    const created = await request(app)
      .post("/api/v1/compliance/consents")
      .set("X-API-Key", ISSUER_API_KEY)
      .send({
        subject_id: subjectId,
        verifier_id: "recruiter-a",
        purpose: "employment_verification",
        data_elements: ["credential_validity", "issuer_did"],
        expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

    expect(created.status).toBe(201);
    expect(typeof created.body.id).toBe("string");
    expect(created.body.subject_id).toBe(subjectId);

    const revoked = await request(app)
      .post(`/api/v1/compliance/consents/${created.body.id}/revoke`)
      .set("X-API-Key", ISSUER_API_KEY)
      .send({});

    expect(revoked.status).toBe(200);
    expect(revoked.body.id).toBe(created.body.id);
    expect(typeof revoked.body.revocation_ts).toBe("string");

    const exported = await request(app)
      .get("/api/v1/compliance/audit-log/export")
      .set("X-API-Key", ISSUER_API_KEY);

    expect(exported.status).toBe(200);
    expect(exported.body.integrity?.valid).toBe(true);
    expect(Array.isArray(exported.body.events)).toBe(true);
    expect(exported.body.events.length).toBeGreaterThan(0);
  });

  it("replays idempotent consent create requests", async () => {
    const subjectId = `subject_${Date.now()}_idem`;
    const payload = {
      subject_id: subjectId,
      verifier_id: "recruiter-a",
      purpose: "employment_verification",
      data_elements: ["credential_validity"],
      expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    const first = await request(app)
      .post("/api/v1/compliance/consents")
      .set("X-API-Key", ISSUER_API_KEY)
      .set("Idempotency-Key", "issuer-idem-1")
      .send(payload);

    const second = await request(app)
      .post("/api/v1/compliance/consents")
      .set("X-API-Key", ISSUER_API_KEY)
      .set("Idempotency-Key", "issuer-idem-1")
      .send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);
  });

  it("supports data export and delete requests", async () => {
    const subjectId = `subject_${Date.now()}_data`;

    const exportReq = await request(app)
      .post("/api/v1/compliance/data-requests/export")
      .set("X-API-Key", ISSUER_API_KEY)
      .send({
        subject_id: subjectId,
        reason: "test_export",
      });

    expect(exportReq.status).toBe(202);
    expect(exportReq.body.request_type).toBe("export");
    expect(exportReq.body.status).toBe("completed");

    const deleteReq = await request(app)
      .post("/api/v1/compliance/data-requests/delete")
      .set("X-API-Key", ISSUER_API_KEY)
      .send({
        subject_id: subjectId,
        confirm: "DELETE",
        reason: "test_delete",
      });

    expect(deleteReq.status).toBe(202);
    expect(deleteReq.body.request_type).toBe("delete");
    expect(deleteReq.body.status).toBe("completed");

    const list = await request(app)
      .get("/api/v1/compliance/data-requests")
      .set("X-API-Key", ISSUER_API_KEY);

    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.requests)).toBe(true);
    const matching = list.body.requests.filter(
      (entry: any) => entry.subject_id === subjectId,
    );
    expect(matching.length).toBeGreaterThanOrEqual(2);
  });
});
