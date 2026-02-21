import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";
import { storage } from "../server/storage";
import { errorHandler } from "../server/middleware/error-handler";

const app = express();
app.use(express.json());
const httpServer = createServer(app);
await registerRoutes(httpServer, app);
app.use(errorHandler);

const API_KEY = "test-api-key";
const TENANT_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("Issuer issuance validation", () => {
  it("rejects issuance when recipient identity is missing", async () => {
    const res = await request(app)
      .post("/api/v1/credentials/issue")
      .set("x-api-key", API_KEY)
      .send({
        templateId: "template-1",
        issuerId: "issuer-1",
        recipient: { name: "Aditi" },
        credentialData: { credentialName: "Degree" },
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("RECIPIENT_INVALID");
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it("returns field-level errors + schemaHint when template schema is JSON schema", async () => {
    const template = await storage.createTemplate({
      tenantId: TENANT_ID,
      name: "Employment Proof",
      version: "1.0.0",
      render: "Hello",
      schema: {
        type: "object",
        required: ["employer", "startDate"],
        properties: {
          employer: { type: "string" },
          startDate: { type: "string" },
          salary: { type: "number" },
        },
      },
      disclosure: {},
    } as any);

    const res = await request(app)
      .post("/api/v1/credentials/issue")
      .set("x-api-key", API_KEY)
      .send({
        templateId: template.id,
        issuerId: "issuer-1",
        recipient: { studentId: "STU-001", name: "Aditi" },
        credentialData: { employer: 123 },
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("CREDENTIAL_DATA_SCHEMA_MISMATCH");
    expect(res.body.schemaHint?.required).toContain("employer");
    expect(res.body.schemaHint?.required).toContain("startDate");
    const paths = (res.body.errors || []).map((e: any) => e.path);
    expect(paths).toContain("credentialData.startDate");
    expect(paths).toContain("credentialData.employer");
  });
});
