import { Router } from "express";
import { verificationEngine } from "../services/verification-engine";
import { fraudDetector } from "../services/fraud-detector";
import { authMiddleware } from "../services/auth-service";
import { storage, VerificationRecord } from "../storage";
import crypto from "crypto";
import {
  idempotencyMiddleware,
  PostgresStateStore,
  signWebhook,
} from "@credverse/shared-auth";
import type { VerificationResultContract } from "@credverse/shared-auth";
import { evaluateVerificationDecisionPolicy } from "../services/verification-decision-policy";

const router = Router();
const writeIdempotency = idempotencyMiddleware({ ttlMs: 6 * 60 * 60 * 1000 });
const vpRequests = new Map<
  string,
  {
    id: string;
    nonce: string;
    createdAt: number;
    purpose: string;
    state?: string;
  }
>();
const MAX_JWT_BYTES = 16 * 1024;
const VP_REQUEST_TTL_MS = Number(
  process.env.OID4VP_REQUEST_TTL_MS || 15 * 60 * 1000,
);
const LEGACY_VERIFY_SUNSET_HEADER =
  process.env.API_LEGACY_SUNSET ??
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
type Oid4vpRequestState = {
  vpRequests: Array<
    [
      string,
      {
        id: string;
        nonce: string;
        createdAt: number;
        purpose: string;
        state?: string;
      },
    ]
  >;
};
const hasDatabase =
  typeof process.env.DATABASE_URL === "string" &&
  process.env.DATABASE_URL.length > 0;
const stateStore = hasDatabase
  ? new PostgresStateStore<Oid4vpRequestState>({
      databaseUrl: process.env.DATABASE_URL as string,
      serviceKey: "recruiter-oid4vp-requests",
    })
  : null;

let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
let persistChain = Promise.resolve();

router.use("/verify", (_req, res, next) => {
  res.setHeader("Deprecation", "true");
  res.setHeader("Sunset", LEGACY_VERIFY_SUNSET_HEADER);
  res.setHeader("Link", '</api/v1/verifications>; rel="successor-version"');
  next();
});

async function ensureHydrated(): Promise<void> {
  if (!stateStore || hydrated) return;
  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      const loaded = await stateStore.load();
      vpRequests.clear();
      for (const [requestId, request] of loaded?.vpRequests || []) {
        vpRequests.set(requestId, request);
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
      await stateStore.save({
        vpRequests: Array.from(vpRequests.entries()),
      });
    })
    .catch((error) => {
      console.error("[OID4VP] Persist failed:", error);
    });
  await persistChain;
}

function pruneExpiredVpRequests(): boolean {
  let changed = false;
  const now = Date.now();
  for (const [requestId, request] of vpRequests.entries()) {
    if (request.createdAt + VP_REQUEST_TTL_MS < now) {
      vpRequests.delete(requestId);
      changed = true;
    }
  }
  return changed;
}

function mapCredentialValidity(
  status: "verified" | "failed" | "suspicious" | "pending",
): VerificationResultContract["credential_validity"] {
  if (status === "verified") return "valid";
  if (status === "failed") return "invalid";
  return "unknown";
}

function mapStatusValidity(
  riskFlags: string[],
): VerificationResultContract["status_validity"] {
  if (riskFlags.includes("REVOKED_CREDENTIAL")) return "revoked";
  return "active";
}

function mapAnchorValidity(
  riskFlags: string[],
): VerificationResultContract["anchor_validity"] {
  if (riskFlags.includes("NO_BLOCKCHAIN_ANCHOR")) return "pending";
  return "anchored";
}

function mapDecisionToLegacyRecommendation(
  decision: VerificationResultContract["decision"],
): "accept" | "review" | "reject" {
  switch (decision) {
    case "approve":
      return "accept";
    case "reject":
      return "reject";
    case "review":
    case "investigate":
      return "review";
  }
}

function mapDecision(
  recommendation: string | undefined,
): VerificationResultContract["decision"] {
  switch (recommendation) {
    case "accept":
      return "approve";
    case "reject":
      return "reject";
    case "review":
      return "review";
    default:
      return "investigate";
  }
}

async function emitVerificationWebhook(
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const targetUrl = process.env.VERIFICATION_WEBHOOK_URL;
  if (!targetUrl) return;

  const secret =
    process.env.VERIFICATION_WEBHOOK_SECRET ||
    process.env.CREDENTIAL_WEBHOOK_SECRET;
  const body = { event, ...payload };
  const signed = secret ? signWebhook(body, secret) : null;

  await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(signed
        ? {
            "X-Webhook-Timestamp": signed.timestamp,
            "X-Webhook-Signature": `sha256=${signed.signature}`,
          }
        : {}),
    },
    body: signed ? signed.payload : JSON.stringify(body),
  });
}

function parseJwtPayloadSafely(jwt: string): Record<string, unknown> {
  if (Buffer.byteLength(jwt, "utf8") > MAX_JWT_BYTES) {
    throw new Error("JWT payload is too large");
  }
  const parts = jwt.split(".");
  if (parts.length < 2) {
    throw new Error("Invalid JWT format");
  }
  const decoded = Buffer.from(parts[1], "base64url").toString();
  const parsed = JSON.parse(decoded);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid JWT payload");
  }
  return parsed as Record<string, unknown>;
}

function readString(value: unknown, fallback = "Unknown"): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

function readCredentialType(
  credentialData: Record<string, unknown> | null,
): string {
  if (!credentialData) return "Unknown";
  const typeValue = credentialData.type;
  if (Array.isArray(typeValue)) {
    return readString(typeValue[0], "Unknown");
  }
  return readString(typeValue, "Unknown");
}

function readSubjectName(
  credentialData: Record<string, unknown> | null,
): string {
  if (!credentialData) return "Unknown";
  const subjectValue = credentialData.credentialSubject;
  if (!subjectValue || typeof subjectValue !== "object") {
    return "Unknown";
  }
  return readString((subjectValue as Record<string, unknown>).name, "Unknown");
}

function readIssuer(credentialData: Record<string, unknown> | null): string {
  if (!credentialData) return "Unknown";
  const issuerValue = credentialData.issuer;
  if (typeof issuerValue === "string")
    return readString(issuerValue, "Unknown");
  if (!issuerValue || typeof issuerValue !== "object") return "Unknown";
  const issuerObject = issuerValue as Record<string, unknown>;
  return readString(issuerObject.name ?? issuerObject.id, "Unknown");
}

function normalizeFraudRecommendation(
  value: unknown,
): "accept" | "review" | "reject" {
  if (value === "accept" || value === "review" || value === "reject") {
    return value;
  }
  if (value === "approve") {
    return "accept";
  }
  return "review";
}

function normalizeFraudAnalysis(fraud: any) {
  return {
    score: Number.isFinite(Number(fraud?.score)) ? Number(fraud.score) : 0,
    flags: Array.isArray(fraud?.flags)
      ? fraud.flags.map((f: unknown) => String(f))
      : [],
    recommendation: normalizeFraudRecommendation(fraud?.recommendation),
    details: Array.isArray(fraud?.details) ? fraud.details : [],
  };
}

function hasUnsignedOrScannedSignal(
  checks: Array<{ name?: string; status?: string; message?: string }>,
): boolean {
  return checks.some((check) => {
    if (check.status !== "warning") return false;
    const text = `${check.name || ""} ${check.message || ""}`.toLowerCase();
    return text.includes("unsigned") || text.includes("scanned");
  });
}

function buildRiskSignals(args: {
  verificationResult: { riskScore: number; riskFlags: string[] };
  fraudAnalysis: { score: number; flags: string[] };
  decisionReasonCodes: string[];
}) {
  const verificationSeverity =
    args.verificationResult.riskScore >= 70
      ? "high"
      : args.verificationResult.riskScore >= 40
        ? "medium"
        : args.verificationResult.riskScore >= 15
          ? "low"
          : "info";
  const fraudSeverity =
    args.fraudAnalysis.score >= 60
      ? "high"
      : args.fraudAnalysis.score >= 30
        ? "medium"
        : args.fraudAnalysis.score >= 10
          ? "low"
          : "info";

  return [
    {
      id: "verification.risk",
      score: args.verificationResult.riskScore,
      severity: verificationSeverity,
      source: "rules",
      reason_codes: args.verificationResult.riskFlags,
    },
    {
      id: "fraud.model",
      score: args.fraudAnalysis.score,
      severity: fraudSeverity,
      source: "ai",
      reason_codes: args.fraudAnalysis.flags,
    },
    {
      id: "decision.policy",
      score: Math.max(
        args.verificationResult.riskScore,
        args.fraudAnalysis.score,
      ),
      severity:
        verificationSeverity === "high" || fraudSeverity === "high"
          ? "high"
          : verificationSeverity === "medium" || fraudSeverity === "medium"
            ? "medium"
            : "low",
      source: "rules",
      reason_codes: args.decisionReasonCodes,
    },
  ];
}

// ============== Instant Verification ==============

/**
 * Verify a single credential (JWT, QR, or raw)
 */
router.post("/verify/instant", writeIdempotency, async (req, res) => {
  try {
    const {
      jwt,
      qrData,
      credential,
      verifiedBy = "Anonymous Recruiter",
    } = req.body;

    if (!jwt && !qrData && !credential) {
      return res.status(400).json({
        error: "Provide jwt, qrData, or credential object",
      });
    }

    // Run verification
    const verificationResult = await verificationEngine.verifyCredential({
      jwt,
      qrData,
      raw: credential,
    });

    // Run fraud analysis
    let credentialData: Record<string, unknown> | null = null;
    if (credential && typeof credential === "object") {
      credentialData = credential as Record<string, unknown>;
    } else if (jwt) {
      try {
        credentialData = parseJwtPayloadSafely(jwt);
      } catch (decodeError: any) {
        return res
          .status(400)
          .json({ error: decodeError?.message || "Invalid JWT payload" });
      }
    }
    const fraudAnalysisRaw = credentialData
      ? await fraudDetector.analyzeCredential(credentialData)
      : { score: 0, flags: [], recommendation: "review", details: [] };
    const fraudAnalysis = normalizeFraudAnalysis(fraudAnalysisRaw);

    const policy = await evaluateVerificationDecisionPolicy({
      verificationStatus: verificationResult.status,
      riskScore: verificationResult.riskScore,
      riskFlags: verificationResult.riskFlags,
      fraudScore: fraudAnalysis.score,
      fraudRecommendation: fraudAnalysis.recommendation,
      fraudFlags: fraudAnalysis.flags,
      isScanned:
        Boolean((credentialData as any)?.scanned) ||
        hasUnsignedOrScannedSignal(verificationResult.checks as any),
    });
    const recommendation = mapDecisionToLegacyRecommendation(policy.decision);

    // Store in history
    const record: VerificationRecord = {
      id: verificationResult.verificationId,
      credentialType: readCredentialType(credentialData),
      issuer: readIssuer(credentialData),
      subject: readSubjectName(credentialData),
      status: verificationResult.status,
      riskScore: verificationResult.riskScore,
      fraudScore: fraudAnalysis.score,
      recommendation,
      timestamp: new Date(),
      verifiedBy,
    };
    await storage.addVerification(record);

    const riskSignals = buildRiskSignals({
      verificationResult,
      fraudAnalysis,
      decisionReasonCodes: policy.reasonCodes,
    });

    const responseBody = {
      success: true,
      verification: verificationResult,
      fraud: fraudAnalysis,
      record,
      reason_codes: policy.reasonCodes,
      risk_signals_version: "risk-v1",
      risk_signals: riskSignals,
      evidence_links: [],
      candidate_summary: {
        candidate_id: verificationResult.verificationId,
        decision: policy.decision,
        confidence: verificationResult.confidence,
        risk_score: verificationResult.riskScore,
        reason_codes: policy.reasonCodes,
        work_score: {
          score: Math.max(0, 100 - verificationResult.riskScore),
        },
      },
      v1: {
        credential_validity: mapCredentialValidity(verificationResult.status),
        status_validity: mapStatusValidity(verificationResult.riskFlags),
        anchor_validity: mapAnchorValidity(verificationResult.riskFlags),
        fraud_score: fraudAnalysis.score,
        fraud_explanations: fraudAnalysis.flags,
        decision: policy.decision,
        decision_reason_codes: policy.reasonCodes,
        reason_codes: policy.reasonCodes,
        risk_signals_version: "risk-v1",
        risk_signals: riskSignals,
        evidence_links: [],
      },
    };

    void emitVerificationWebhook("verification.completed", {
      verificationId: verificationResult.verificationId,
      status: verificationResult.status,
      credentialType: record.credentialType,
      issuer: record.issuer,
      subject: record.subject,
      riskScore: verificationResult.riskScore,
    }).catch((error) => console.error("Verification webhook error:", error));

    res.json(responseBody);
  } catch (error) {
    console.error("Instant verification error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});

/**
 * Verify via QR scan (simplified endpoint)
 */
router.post("/verify/qr", writeIdempotency, async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ error: "qrData is required" });
    }

    // Parse QR and extract verification token
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch {
      parsedData = JSON.parse(Buffer.from(qrData, "base64").toString());
    }

    const verificationResult = await verificationEngine.verifyCredential({
      qrData: JSON.stringify(parsedData),
    });

    res.json({
      success: true,
      verification: verificationResult,
    });
  } catch (error) {
    console.error("QR verification error:", error);
    res.status(500).json({ error: "QR verification failed" });
  }
});

// ============== Bulk Verification ==============

/**
 * Bulk verify credentials from array
 */
router.post("/verify/bulk", writeIdempotency, async (req, res) => {
  try {
    const { credentials } = req.body;

    if (!credentials || !Array.isArray(credentials)) {
      return res.status(400).json({ error: "credentials array is required" });
    }

    if (credentials.length > 100) {
      return res
        .status(400)
        .json({ error: "Maximum 100 credentials per batch" });
    }

    const payloads = credentials.map((cred) => ({
      jwt: cred.jwt,
      qrData: cred.qrData,
      raw: cred.credential || cred,
    }));

    const bulkResult = await verificationEngine.bulkVerify(payloads);

    res.json({
      success: true,
      result: bulkResult,
    });
  } catch (error) {
    console.error("Bulk verification error:", error);
    res.status(500).json({ error: "Bulk verification failed" });
  }
});

/**
 * Get bulk job status
 */
router.get("/verify/bulk/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await verificationEngine.getBulkJobResult(jobId);

    if (!result) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error("Get bulk job error:", error);
    res.status(500).json({ error: "Failed to get job status" });
  }
});

// New route: Verify credential via link URL
router.post(
  "/verify/link",
  authMiddleware,
  writeIdempotency,
  async (req, res) => {
    try {
      const { link } = req.body;
      if (!link) {
        return res.status(400).json({ error: "Link URL is required" });
      }
      // Fetch credential from the provided URL (expects JSON)
      const response = await fetch(link);
      if (!response.ok) {
        return res
          .status(400)
          .json({
            error: `Failed to fetch credential from link (status ${response.status})`,
          });
      }
      const payloadUnknown: unknown = await response.json();
      if (!payloadUnknown || typeof payloadUnknown !== "object") {
        return res
          .status(400)
          .json({ error: "Invalid credential response payload" });
      }
      const payload = payloadUnknown as Record<string, unknown>;

      let verificationResult;
      let credentialData: Record<string, unknown> = {};

      // Handle wrapper response (from Issuer offer/consume) which often contains vcJwt or a credential object
      const payloadJwt =
        typeof payload.vcJwt === "string" ? payload.vcJwt : null;
      if (payloadJwt) {
        verificationResult = await verificationEngine.verifyCredential({
          jwt: payloadJwt,
        });
        try {
          const decoded = parseJwtPayloadSafely(payloadJwt);
          const vcClaim = decoded.vc;
          if (vcClaim && typeof vcClaim === "object") {
            credentialData = vcClaim as Record<string, unknown>;
          } else {
            credentialData = decoded;
          }
        } catch {
          credentialData = {};
        }
      } else if (payload.credential && typeof payload.credential === "object") {
        verificationResult = await verificationEngine.verifyCredential({
          raw: payload.credential,
        });
        credentialData = payload.credential as Record<string, unknown>;
      } else {
        // Fallback to raw payload (if it's a direct VC)
        verificationResult = await verificationEngine.verifyCredential({
          raw: payload,
        });
        credentialData = payload;
      }

      // Run fraud analysis on the fetched credential data
      const fraudAnalysis =
        await fraudDetector.analyzeCredential(credentialData);
      // Store verification record
      const record: VerificationRecord = {
        id: verificationResult.verificationId,
        credentialType: readCredentialType(credentialData),
        issuer: readIssuer(credentialData),
        subject: readSubjectName(credentialData),
        status: verificationResult.status,
        riskScore: verificationResult.riskScore,
        fraudScore: fraudAnalysis.score,
        recommendation: fraudAnalysis.recommendation,
        timestamp: new Date(),
        verifiedBy: "Link Verification",
      };
      await storage.addVerification(record);
      res.json({
        success: true,
        verification: verificationResult,
        fraud: fraudAnalysis,
        record,
      });
    } catch (error) {
      console.error("Link verification error:", error);
      res.status(500).json({ error: "Link verification failed" });
    }
  },
);

// ============== OpenID4VP + V1 Verification APIs ==============

router.post(
  "/v1/oid4vp/requests",
  authMiddleware,
  writeIdempotency,
  async (req, res) => {
    await ensureHydrated();
    if (pruneExpiredVpRequests()) {
      await queuePersist();
    }

    const { purpose = "credential_verification", state } = req.body || {};
    const requestId = `vp_req_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const nonce = crypto.randomBytes(16).toString("hex");

    vpRequests.set(requestId, {
      id: requestId,
      nonce,
      createdAt: Date.now(),
      purpose,
      state,
    });
    await queuePersist();

    res.status(201).json({
      request_id: requestId,
      nonce,
      state: state || null,
      presentation_definition: {
        id: requestId,
        input_descriptors: [
          {
            id: "credential",
            format: {
              jwt_vc_json: { alg: ["ES256", "EdDSA"] },
              "vc+sd-jwt": { sd_jwt_alg_values: ["ES256", "EdDSA"] },
            },
          },
        ],
      },
    });
  },
);

router.post(
  "/v1/oid4vp/responses",
  authMiddleware,
  writeIdempotency,
  async (req, res) => {
    try {
      await ensureHydrated();
      if (pruneExpiredVpRequests()) {
        await queuePersist();
      }

      const {
        request_id: requestId,
        vp_token: vpToken,
        credential,
        jwt,
      } = req.body || {};
      const request = requestId ? vpRequests.get(requestId) : undefined;
      if (requestId && !request) {
        return res.status(400).json({ error: "unknown request_id" });
      }

      if (requestId && request) {
        vpRequests.delete(requestId);
        await queuePersist();
      }

      const verificationResult = await verificationEngine.verifyCredential({
        jwt: jwt || vpToken,
        raw: credential,
      });

      res.json({
        request_id: requestId || null,
        status: verificationResult.status,
        verification_id: verificationResult.verificationId,
        checks: verificationResult.checks,
        risk_score: verificationResult.riskScore,
      });
    } catch (error) {
      console.error("OID4VP response processing failed:", error);
      res
        .status(500)
        .json({ error: "failed to process presentation response" });
    }
  },
);

router.post(
  "/v1/verifications/instant",
  authMiddleware,
  writeIdempotency,
  async (req, res) => {
    try {
      const {
        jwt,
        qrData,
        credential,
        verifiedBy = "Anonymous Recruiter",
      } = req.body || {};
      if (!jwt && !qrData && !credential) {
        return res
          .status(400)
          .json({ error: "Provide jwt, qrData, or credential object" });
      }

      const verificationResult = await verificationEngine.verifyCredential({
        jwt,
        qrData,
        raw: credential,
      });

      let credentialData: Record<string, unknown> | null = null;
      if (credential && typeof credential === "object") {
        credentialData = credential as Record<string, unknown>;
      } else if (typeof jwt === "string") {
        try {
          credentialData = parseJwtPayloadSafely(jwt);
        } catch (decodeError: any) {
          return res
            .status(400)
            .json({ error: decodeError?.message || "Invalid JWT payload" });
        }
      }

      const fraudAnalysisRaw = credentialData
        ? await fraudDetector.analyzeCredential(credentialData)
        : { score: 0, flags: [], recommendation: "review", details: [] };
      const fraudAnalysis = normalizeFraudAnalysis(fraudAnalysisRaw);

      const policy = await evaluateVerificationDecisionPolicy({
        verificationStatus: verificationResult.status,
        riskScore: verificationResult.riskScore,
        riskFlags: verificationResult.riskFlags,
        fraudScore: fraudAnalysis.score,
        fraudRecommendation: fraudAnalysis.recommendation,
        fraudFlags: fraudAnalysis.flags,
        isScanned:
          Boolean((credentialData as any)?.scanned) ||
          hasUnsignedOrScannedSignal(verificationResult.checks as any),
      });
      const recommendation = mapDecisionToLegacyRecommendation(policy.decision);

      const record: VerificationRecord = {
        id: verificationResult.verificationId,
        credentialType: readCredentialType(credentialData),
        issuer: readIssuer(credentialData),
        subject: readSubjectName(credentialData),
        status: verificationResult.status,
        riskScore: verificationResult.riskScore,
        fraudScore: fraudAnalysis.score,
        recommendation,
        timestamp: new Date(),
        verifiedBy,
      };
      await storage.addVerification(record);

      const riskSignals = buildRiskSignals({
        verificationResult,
        fraudAnalysis,
        decisionReasonCodes: policy.reasonCodes,
      });

      const contractResult: VerificationResultContract = {
        id: verificationResult.verificationId,
        credential_validity: mapCredentialValidity(verificationResult.status),
        status_validity: mapStatusValidity(verificationResult.riskFlags),
        anchor_validity: mapAnchorValidity(verificationResult.riskFlags),
        fraud_score: fraudAnalysis.score,
        fraud_explanations: fraudAnalysis.flags,
        decision: policy.decision,
        decision_reason_codes: policy.reasonCodes,
      };

      res.json({
        ...contractResult,
        verification_id: contractResult.id,
        checks: verificationResult.checks,
        reason_codes: policy.reasonCodes,
        risk_signals_version: "risk-v1",
        risk_signals: riskSignals,
        evidence_links: [],
        candidate_summary: {
          candidate_id: verificationResult.verificationId,
          decision: policy.decision,
          confidence: verificationResult.confidence,
          risk_score: verificationResult.riskScore,
          reason_codes: policy.reasonCodes,
          work_score: {
            score: Math.max(0, 100 - verificationResult.riskScore),
          },
        },
        policy: {
          matched_rules: policy.matchedRules,
        },
      });
    } catch (error) {
      console.error("V1 instant verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  },
);

router.post(
  "/v1/verifications/bulk",
  authMiddleware,
  writeIdempotency,
  async (req, res) => {
    try {
      const { credentials } = req.body || {};
      if (!credentials || !Array.isArray(credentials)) {
        return res.status(400).json({ error: "credentials array is required" });
      }
      if (credentials.length > 1000) {
        return res
          .status(400)
          .json({ error: "Maximum 1000 credentials per batch" });
      }

      const payloads = credentials.map((cred: Record<string, unknown>) => ({
        jwt: typeof cred.jwt === "string" ? cred.jwt : undefined,
        qrData: typeof cred.qrData === "string" ? cred.qrData : undefined,
        raw: cred.credential ?? cred,
      }));
      const bulkResult = await verificationEngine.bulkVerify(payloads);

      res.json({
        id: bulkResult.id,
        total: bulkResult.total,
        verified: bulkResult.verified,
        failed: bulkResult.failed,
        suspicious: bulkResult.suspicious,
        completed_at: bulkResult.completedAt,
      });
    } catch (error) {
      console.error("V1 bulk verification error:", error);
      res.status(500).json({ error: "Bulk verification failed" });
    }
  },
);

router.get("/v1/verifications", authMiddleware, async (req, res) => {
  try {
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const startDateRaw =
      typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDateRaw =
      typeof req.query.endDate === "string" ? req.query.endDate : undefined;
    const limitRaw = Number.parseInt(String(req.query.limit ?? "50"), 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 200)
      : 50;

    const startDate = startDateRaw ? new Date(startDateRaw) : undefined;
    const endDate = endDateRaw ? new Date(endDateRaw) : undefined;

    if (startDate && Number.isNaN(startDate.getTime())) {
      return res
        .status(400)
        .json({ error: "Invalid startDate query parameter" });
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid endDate query parameter" });
    }

    const records = await storage.getVerifications({
      status,
      startDate,
      endDate,
    });
    const items = records.slice(0, limit).map((verification) => ({
      id: verification.id,
      status: verification.status,
      credential_type: verification.credentialType,
      issuer: verification.issuer,
      subject: verification.subject,
      risk_score: verification.riskScore,
      fraud_score: verification.fraudScore,
      recommendation: verification.recommendation,
      timestamp: verification.timestamp,
    }));

    res.json({
      total: records.length,
      items,
    });
  } catch (error) {
    console.error("V1 verification list error:", error);
    res.status(500).json({ error: "Failed to list verifications" });
  }
});

router.get("/v1/verifications/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  const verification = await storage.getVerification(id);
  if (!verification) {
    return res.status(404).json({ error: "Verification not found" });
  }
  const contractResult: VerificationResultContract = {
    id: verification.id,
    credential_validity:
      verification.status === "verified"
        ? "valid"
        : verification.status === "failed"
          ? "invalid"
          : "unknown",
    status_validity: "unknown",
    anchor_validity: "unknown",
    fraud_score: verification.fraudScore,
    fraud_explanations: [],
    decision: mapDecision(verification.recommendation),
    decision_reason_codes: [],
  };

  res.json({
    ...contractResult,
    id: verification.id,
    status: verification.status,
    credential_type: verification.credentialType,
    issuer: verification.issuer,
    subject: verification.subject,
    risk_score: verification.riskScore,
    fraud_score: verification.fraudScore,
    recommendation: verification.recommendation,
    timestamp: verification.timestamp,
  });
});

export default router;
