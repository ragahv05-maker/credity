import { Router } from "express";
import { walletService } from "../services/wallet-service";
import { authMiddleware } from "../services/auth-service";
import { resolveBoundUserId } from "../utils/authz";

const router = Router();

router.get("/compliance/consents", authMiddleware, async (req, res) => {
  try {
    const userId = resolveBoundUserId(req, res);
    if (!userId) return;

    const consents = await walletService.listConsentGrants(userId);
    res.json({ count: consents.length, consents });
  } catch (error: any) {
    res
      .status(500)
      .json({
        error: error?.message || "Failed to list consents",
        code: "COMPLIANCE_CONSENTS_LIST_FAILED",
      });
  }
});

router.post("/compliance/consents", authMiddleware, async (req, res) => {
  try {
    const userId = resolveBoundUserId(req, res);
    if (!userId) return;

    const verifierId =
      typeof req.body?.verifierId === "string"
        ? req.body.verifierId.trim()
        : "";
    const purpose =
      typeof req.body?.purpose === "string" ? req.body.purpose.trim() : "";
    const dataElements = Array.isArray(req.body?.dataElements)
      ? req.body.dataElements.filter((v: unknown) => typeof v === "string")
      : [];
    const expiry = typeof req.body?.expiry === "string" ? req.body.expiry : "";

    if (!verifierId || !purpose || dataElements.length === 0 || !expiry) {
      return res.status(400).json({
        error: "verifierId, purpose, dataElements[], and expiry are required",
        code: "CONSENT_VALIDATION_FAILED",
      });
    }

    const parsedExpiry = new Date(expiry);
    if (Number.isNaN(parsedExpiry.getTime())) {
      return res
        .status(400)
        .json({
          error: "expiry must be an ISO datetime string",
          code: "CONSENT_INVALID_EXPIRY",
        });
    }

    const consent = await walletService.createConsentGrant(userId, {
      verifierId,
      purpose,
      dataElements,
      expiry: parsedExpiry.toISOString(),
      consentProof:
        typeof req.body?.consentProof === "object" && req.body.consentProof
          ? req.body.consentProof
          : undefined,
    });

    res.status(201).json(consent);
  } catch (error: any) {
    res
      .status(500)
      .json({
        error: error?.message || "Failed to create consent grant",
        code: "CONSENT_CREATE_FAILED",
      });
  }
});

router.post(
  "/compliance/consents/:consentId/revoke",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = resolveBoundUserId(req, res);
      if (!userId) return;

      const revoked = await walletService.revokeConsentGrant(
        userId,
        req.params.consentId,
      );
      if (!revoked) {
        return res
          .status(404)
          .json({
            error: "consent grant not found",
            code: "CONSENT_NOT_FOUND",
          });
      }

      res.json(revoked);
    } catch (error: any) {
      res
        .status(500)
        .json({
          error: error?.message || "Failed to revoke consent grant",
          code: "CONSENT_REVOKE_FAILED",
        });
    }
  },
);

router.get("/compliance/data-requests", authMiddleware, async (req, res) => {
  try {
    const userId = resolveBoundUserId(req, res);
    if (!userId) return;

    const requests = await walletService.listDataRequests(userId);
    res.json({ count: requests.length, requests });
  } catch (error: any) {
    res
      .status(500)
      .json({
        error: error?.message || "Failed to list data requests",
        code: "DATA_REQUESTS_LIST_FAILED",
      });
  }
});

router.post(
  "/compliance/data-requests/export",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = resolveBoundUserId(req, res);
      if (!userId) return;

      const request = await walletService.submitDataRequest(userId, {
        type: "export",
        reason:
          typeof req.body?.reason === "string" ? req.body.reason : undefined,
      });

      res.status(202).json(request);
    } catch (error: any) {
      res
        .status(500)
        .json({
          error: error?.message || "Failed to submit export request",
          code: "DATA_EXPORT_REQUEST_FAILED",
        });
    }
  },
);

router.post(
  "/compliance/data-requests/delete",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = resolveBoundUserId(req, res);
      if (!userId) return;

      if (req.body?.confirm !== "DELETE") {
        return res
          .status(400)
          .json({
            error: "confirm must be set to DELETE",
            code: "DATA_DELETE_CONFIRM_REQUIRED",
          });
      }

      const request = await walletService.submitDataRequest(userId, {
        type: "delete",
        reason:
          typeof req.body?.reason === "string" ? req.body.reason : undefined,
      });

      res.status(202).json(request);
    } catch (error: any) {
      res
        .status(500)
        .json({
          error: error?.message || "Failed to submit delete request",
          code: "DATA_DELETE_REQUEST_FAILED",
        });
    }
  },
);

router.get("/compliance/certin/incidents", async (_req, res) => {
  try {
    const incidents = await walletService.listCertInIncidents();
    res.json({ count: incidents.length, incidents });
  } catch (error: any) {
    res
      .status(500)
      .json({
        error: error?.message || "Failed to list incidents",
        code: "CERTIN_LIST_FAILED",
      });
  }
});

router.post("/compliance/certin/incidents", async (req, res) => {
  try {
    const category =
      typeof req.body?.category === "string" ? req.body.category.trim() : "";
    const severity =
      typeof req.body?.severity === "string"
        ? req.body.severity.toLowerCase()
        : "";
    if (
      !category ||
      !["low", "medium", "high", "critical"].includes(severity)
    ) {
      return res
        .status(400)
        .json({
          error:
            "category and severity (low|medium|high|critical) are required",
          code: "CERTIN_VALIDATION_FAILED",
        });
    }

    const incident = await walletService.createCertInIncident({
      category,
      severity: severity as "low" | "medium" | "high" | "critical",
      detectedAt:
        typeof req.body?.detectedAt === "string"
          ? req.body.detectedAt
          : undefined,
      metadata:
        typeof req.body?.metadata === "object" && req.body.metadata
          ? req.body.metadata
          : undefined,
    });

    res.status(201).json(incident);
  } catch (error: any) {
    res
      .status(500)
      .json({
        error: error?.message || "Failed to create incident record",
        code: "CERTIN_CREATE_FAILED",
      });
  }
});

export default router;
