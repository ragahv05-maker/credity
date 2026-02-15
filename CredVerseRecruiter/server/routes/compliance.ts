import { Router } from "express";
import { randomUUID } from "crypto";
import {
  appendAuditEvent,
  type AuditEventRecord,
  PostgresStateStore,
  verifyAuditChain,
} from "@credverse/shared-auth";
import { authMiddleware } from "../services/auth-service";

type ConsentRecord = {
  id: string;
  subject_id: string;
  verifier_id: string;
  purpose: string;
  data_elements: string[];
  expiry: string;
  revocation_ts: string | null;
  consent_proof: Record<string, unknown>;
  created_at: string;
};

type DataRequestRecord = {
  id: string;
  subject_id: string;
  request_type: "export" | "delete";
  status: "accepted" | "processing" | "completed";
  reason?: string;
  created_at: string;
  completed_at: string | null;
  result?: Record<string, unknown>;
};

type IncidentRecord = {
  id: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  detected_at: string;
  report_due_at: string;
  status: "open" | "reported" | "closed";
  log_retention_days: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

type ComplianceState = {
  consents: ConsentRecord[];
  data_requests: DataRequestRecord[];
  incidents: IncidentRecord[];
  audit_log: AuditEventRecord[];
};

const router = Router();
// Apply auth ONLY to compliance routes, not all /api/* endpoints.
router.use(["/v1/compliance", "/compliance"], authMiddleware);

const hasDatabase = typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.length > 0;
const stateStore = hasDatabase
  ? new PostgresStateStore<ComplianceState>({
    databaseUrl: process.env.DATABASE_URL as string,
    serviceKey: "recruiter-compliance",
  })
  : null;

const state: ComplianceState = {
  consents: [],
  data_requests: [],
  incidents: [],
  audit_log: [],
};

let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
let persistChain = Promise.resolve();

async function ensureHydrated(): Promise<void> {
  if (!stateStore || hydrated) return;
  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      const loaded = await stateStore.load();
      if (loaded) {
        state.consents = loaded.consents || [];
        state.data_requests = loaded.data_requests || [];
        state.incidents = loaded.incidents || [];
        state.audit_log = loaded.audit_log || [];
      } else {
        await stateStore.save(state);
      }
      hydrated = true;
    })();
  }
  await hydrationPromise;
}

async function queuePersist(): Promise<void> {
  if (!stateStore) return;
  persistChain = persistChain
    .then(async () => {
      await stateStore.save(state);
    })
    .catch((error) => {
      console.error("[Recruiter Compliance] Persist failed:", error);
    });
  await persistChain;
}

function actorFromRequest(req: any): string {
  return req?.user?.userId || "recruiter-system";
}

async function recordAudit(
  eventType: string,
  actorId: string,
  payload: Record<string, unknown>,
): Promise<AuditEventRecord> {
  const event = appendAuditEvent(state.audit_log, {
    id: randomUUID(),
    event_type: eventType,
    actor_id: actorId,
    payload,
    created_at: new Date().toISOString(),
  });
  await queuePersist();
  return event;
}

router.get("/v1/compliance/consents", async (_req, res) => {
  await ensureHydrated();
  res.json({ count: state.consents.length, consents: state.consents });
});

router.post("/v1/compliance/consents", async (req, res) => {
  await ensureHydrated();
  const subjectId = typeof req.body?.subject_id === "string" ? req.body.subject_id.trim() : "";
  const verifierId = typeof req.body?.verifier_id === "string" ? req.body.verifier_id.trim() : "";
  const purpose = typeof req.body?.purpose === "string" ? req.body.purpose.trim() : "";
  const dataElements = Array.isArray(req.body?.data_elements)
    ? req.body.data_elements.filter((entry: unknown) => typeof entry === "string")
    : [];
  const expiry = typeof req.body?.expiry === "string" ? req.body.expiry : "";

  if (!subjectId || !verifierId || !purpose || dataElements.length === 0 || !expiry) {
    return res.status(400).json({
      error: "subject_id, verifier_id, purpose, data_elements[], and expiry are required",
    });
  }

  const parsedExpiry = new Date(expiry);
  if (Number.isNaN(parsedExpiry.getTime())) {
    return res.status(400).json({ error: "expiry must be a valid ISO datetime" });
  }

  const consent: ConsentRecord = {
    id: randomUUID(),
    subject_id: subjectId,
    verifier_id: verifierId,
    purpose,
    data_elements: dataElements,
    expiry: parsedExpiry.toISOString(),
    revocation_ts: null,
    consent_proof: typeof req.body?.consent_proof === "object" && req.body?.consent_proof
      ? req.body.consent_proof
      : {
        issued_by: "credverse-recruiter",
        issued_at: new Date().toISOString(),
      },
    created_at: new Date().toISOString(),
  };

  state.consents.unshift(consent);
  await recordAudit("consent.created", actorFromRequest(req), {
    consent_id: consent.id,
    subject_id: consent.subject_id,
    verifier_id: consent.verifier_id,
  });

  return res.status(201).json(consent);
});

router.post("/v1/compliance/consents/:consentId/revoke", async (req, res) => {
  await ensureHydrated();
  const consent = state.consents.find((item) => item.id === req.params.consentId);
  if (!consent) {
    return res.status(404).json({ error: "consent not found" });
  }
  if (!consent.revocation_ts) {
    consent.revocation_ts = new Date().toISOString();
    await recordAudit("consent.revoked", actorFromRequest(req), {
      consent_id: consent.id,
      subject_id: consent.subject_id,
    });
  }
  return res.json(consent);
});

router.get("/v1/compliance/data-requests", async (_req, res) => {
  await ensureHydrated();
  res.json({ count: state.data_requests.length, requests: state.data_requests });
});

router.post("/v1/compliance/data-requests/export", async (req, res) => {
  await ensureHydrated();
  const subjectId = typeof req.body?.subject_id === "string" ? req.body.subject_id.trim() : "";
  if (!subjectId) {
    return res.status(400).json({ error: "subject_id is required" });
  }

  const record: DataRequestRecord = {
    id: randomUUID(),
    subject_id: subjectId,
    request_type: "export",
    status: "completed",
    reason: typeof req.body?.reason === "string" ? req.body.reason : undefined,
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    result: {
      consents: state.consents.filter((consent) => consent.subject_id === subjectId),
      incident_refs: state.incidents
        .filter((incident) => (incident.metadata?.subject_id as string | undefined) === subjectId)
        .map((incident) => incident.id),
    },
  };
  state.data_requests.unshift(record);
  await recordAudit("data_request.export.completed", actorFromRequest(req), {
    request_id: record.id,
    subject_id: record.subject_id,
  });

  return res.status(202).json(record);
});

router.post("/v1/compliance/data-requests/delete", async (req, res) => {
  await ensureHydrated();
  const subjectId = typeof req.body?.subject_id === "string" ? req.body.subject_id.trim() : "";
  if (!subjectId) {
    return res.status(400).json({ error: "subject_id is required" });
  }
  if (req.body?.confirm !== "DELETE") {
    return res.status(400).json({ error: "confirm must be DELETE" });
  }

  const beforeCount = state.consents.length;
  state.consents = state.consents.filter((consent) => consent.subject_id !== subjectId);

  const record: DataRequestRecord = {
    id: randomUUID(),
    subject_id: subjectId,
    request_type: "delete",
    status: "completed",
    reason: typeof req.body?.reason === "string" ? req.body.reason : undefined,
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    result: {
      deleted_consents: beforeCount - state.consents.length,
    },
  };
  state.data_requests.unshift(record);
  await recordAudit("data_request.delete.completed", actorFromRequest(req), {
    request_id: record.id,
    subject_id: record.subject_id,
    deleted_consents: record.result?.deleted_consents || 0,
  });

  return res.status(202).json(record);
});

router.get("/v1/compliance/certin/incidents", async (_req, res) => {
  await ensureHydrated();
  const now = Date.now();
  const incidents = state.incidents.map((incident) => ({
    ...incident,
    seconds_to_report_due: Math.max(0, Math.floor((new Date(incident.report_due_at).getTime() - now) / 1000)),
  }));
  res.json({ count: incidents.length, incidents });
});

router.post("/v1/compliance/certin/incidents", async (req, res) => {
  await ensureHydrated();
  const category = typeof req.body?.category === "string" ? req.body.category.trim() : "";
  const severity = typeof req.body?.severity === "string" ? req.body.severity.toLowerCase() : "";
  if (!category || !["low", "medium", "high", "critical"].includes(severity)) {
    return res.status(400).json({ error: "category and severity are required" });
  }

  const detectedAt = typeof req.body?.detected_at === "string" ? req.body.detected_at : new Date().toISOString();
  const detectedDate = new Date(detectedAt);
  if (Number.isNaN(detectedDate.getTime())) {
    return res.status(400).json({ error: "detected_at must be valid ISO datetime" });
  }

  const incident: IncidentRecord = {
    id: randomUUID(),
    category,
    severity: severity as IncidentRecord["severity"],
    detected_at: detectedDate.toISOString(),
    report_due_at: new Date(detectedDate.getTime() + 6 * 60 * 60 * 1000).toISOString(),
    status: "open",
    log_retention_days: 180,
    metadata: typeof req.body?.metadata === "object" && req.body?.metadata ? req.body.metadata : {},
    created_at: new Date().toISOString(),
  };
  state.incidents.unshift(incident);
  await recordAudit("certin.incident.created", actorFromRequest(req), {
    incident_id: incident.id,
    category: incident.category,
    severity: incident.severity,
  });

  return res.status(201).json(incident);
});

router.get("/v1/compliance/audit-log/export", async (req, res) => {
  await ensureHydrated();
  const integrity = verifyAuditChain(state.audit_log);
  const format = typeof req.query?.format === "string" ? req.query.format : "json";

  if (format === "ndjson") {
    const lines = state.audit_log.map((event) => JSON.stringify(event));
    res.setHeader("Content-Type", "application/x-ndjson");
    return res.send(lines.join("\n"));
  }

  return res.json({
    exported_at: new Date().toISOString(),
    count: state.audit_log.length,
    integrity,
    events: state.audit_log,
  });
});

export default router;
