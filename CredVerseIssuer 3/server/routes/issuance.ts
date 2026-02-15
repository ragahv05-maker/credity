import { Router } from "express";
import { storage } from "../storage";
import { issuanceService, RevocationError } from "../services/issuance";
import { apiKeyOrAuthMiddleware } from "../auth";
import { idempotencyMiddleware } from "@credverse/shared-auth";
import { getCredentialStatus, revokeCredentialStatus } from "../services/status-list-service";
import {
    getDeadLetterJobs,
    getJobStatus,
    getQueueReliabilityConfig,
    getQueueStats,
    isQueueAvailable,
    replayDeadLetterJob,
} from "../services/queue-service";

const router = Router();

router.use(apiKeyOrAuthMiddleware);
const writeIdempotency = idempotencyMiddleware({ ttlMs: 6 * 60 * 60 * 1000 });

async function resolveTenantId(req: any): Promise<string | undefined> {
    // Prefer API key tenant resolution when present.
    const apiKeyHeader = req.headers?.["x-api-key"];
    if (typeof apiKeyHeader === "string" && apiKeyHeader.trim().length > 0) {
        const apiKey = await storage.getApiKey(apiKeyHeader);
        if (apiKey?.tenantId) {
            req.tenantId = apiKey.tenantId;
            return apiKey.tenantId;
        }
    }

    const existingTenantId = typeof req.tenantId === "string" && req.tenantId.trim().length > 0 ? req.tenantId : undefined;
    if (existingTenantId) {
        return existingTenantId;
    }

    return undefined;
}

function hasIssuerAccess(req: any): boolean {
    const hasApiKey = typeof req.headers?.["x-api-key"] === "string";
    if (hasApiKey) {
        return true;
    }

    const role = typeof req.user?.role === "string" ? req.user.role.toLowerCase() : "";
    return role === "admin" || role === "issuer";
}

function authorizeQueueOperations(req: any, res: any): boolean {
    if (hasIssuerAccess(req)) {
        return true;
    }

    res.status(403).json({
        message: "Queue operations require issuer/admin role or API key",
        code: "QUEUE_FORBIDDEN",
    });
    return false;
}

function authorizeIssuanceWrite(req: any, res: any): boolean {
    if (hasIssuerAccess(req)) {
        return true;
    }

    res.status(403).json({
        message: "Issuance/revocation requires issuer/admin role or API key",
        code: "ISSUER_FORBIDDEN",
    });
    return false;
}

router.post("/credentials/:id/offer", writeIdempotency, async (req, res) => {
    try {
        const credential = await storage.getCredential(req.params.id);
        if (!credential) {
            return res.status(404).json({ message: "Credential not found" });
        }

        const tenantId = (req as any).tenantId;
        if (credential.tenantId !== tenantId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const token = issuanceService.createOffer(credential.id);
        // Use public route
        const baseUrl = `${req.protocol}://${req.get('host')}/api/v1/public/issuance/offer/consume?token=${token}`;
        const deepLink = `credverse://offer?url=${encodeURIComponent(baseUrl)}`;

        res.json({
            offerToken: token,
            offerUrl: baseUrl, // URL for wallet to fetch credential
            deepLink: deepLink, // Deep link to open wallet app
            qrCodeData: deepLink // Data to embed in QR code
        });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.post("/credentials/issue", writeIdempotency, async (req, res) => {
    try {
        if (!authorizeIssuanceWrite(req as any, res)) {
            return;
        }

        const tenantId = (req as any).tenantId;

        const { issuanceRequestSchema, normalizeRecipient, validateRecipient, validateCredentialDataAgainstTemplateSchema } = await import("../services/issuance-validation");
        const parsed = issuanceRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Issuance request failed validation",
                code: "ISSUANCE_VALIDATION_FAILED",
                errors: parsed.error.issues.map((i) => ({
                    path: i.path.join("."),
                    message: i.message,
                })),
            });
        }

        const { templateId, issuerId, credentialData } = parsed.data;
        const recipient = normalizeRecipient(parsed.data.recipient);

        const recipientErrors = validateRecipient(recipient);
        if (recipientErrors.length > 0) {
            return res.status(400).json({
                message: "Recipient identity is incomplete",
                code: "RECIPIENT_INVALID",
                errors: recipientErrors,
            });
        }

        // Preflight template schema guidance so the UI can help users recover.
        const template = await storage.getTemplate(templateId);
        if (!template) {
            return res.status(404).json({ message: "Template not found", code: "TEMPLATE_NOT_FOUND" });
        }
        const templateTenantId = typeof (template as any).tenantId === "string" ? String((template as any).tenantId).trim() : undefined;
        const requestTenantId = String(tenantId).trim();
        if (templateTenantId && templateTenantId !== requestTenantId) {
            return res.status(403).json({
                message: "Forbidden",
                code: "TEMPLATE_FORBIDDEN",
            });
        }

        const schemaCheck = validateCredentialDataAgainstTemplateSchema((template as any).schema, credentialData);
        if (!schemaCheck.ok) {
            return res.status(400).json({
                message: "Credential data does not match template schema",
                code: "CREDENTIAL_DATA_SCHEMA_MISMATCH",
                errors: schemaCheck.errors,
                schemaHint: schemaCheck.schemaHint,
            });
        }

        const credential = await issuanceService.issueCredential(
            tenantId,
            templateId,
            issuerId,
            recipient,
            credentialData
        );

        res.status(201).json({
            ...credential,
            schemaHint: schemaCheck.schemaHint,
        });
    } catch (error: any) {
        const message = error.message || "Internal Server Error";
        const status = message.includes("queue") || message.includes("REDIS_URL") ? 503 : 500;
        res.status(status).json({ message, code: status === 503 ? "QUEUE_UNAVAILABLE" : "ISSUANCE_FAILED" });
    }
});

router.post("/credentials/bulk-issue", writeIdempotency, async (req, res) => {
    try {
        if (!authorizeIssuanceWrite(req as any, res)) {
            return;
        }

        const tenantId = (req as any).tenantId;
        const { templateId, issuerId, recipientsData } = req.body;

        if (!templateId || !issuerId || !Array.isArray(recipientsData)) {
            return res.status(400).json({ message: "Invalid bulk issuance data" });
        }

        const result = await issuanceService.bulkIssue(
            tenantId,
            templateId,
            issuerId,
            recipientsData
        );

        res.status(202).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Internal Server Error" });
    }
});

router.get("/queue/stats", async (_req, res) => {
    try {
        if (!authorizeQueueOperations(_req as any, res)) {
            return;
        }
        if (!isQueueAvailable()) {
            return res.status(503).json({
                message: "Queue service unavailable",
                code: "QUEUE_UNAVAILABLE",
                queue: { available: false },
            });
        }

        const [stats, reliability] = await Promise.all([
            getQueueStats(),
            getQueueReliabilityConfig(),
        ]);
        res.json({
            queue: {
                available: true,
                stats,
                reliability,
            },
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to fetch queue stats" });
    }
});

router.get("/queue/jobs/:jobId", async (req, res) => {
    try {
        if (!authorizeQueueOperations(req as any, res)) {
            return;
        }
        if (!isQueueAvailable()) {
            return res.status(503).json({
                message: "Queue service unavailable",
                code: "QUEUE_UNAVAILABLE",
                queue: { available: false },
            });
        }

        const status = await getJobStatus(req.params.jobId);
        if (!status) {
            return res.status(404).json({ message: "Job not found", code: "QUEUE_JOB_NOT_FOUND" });
        }

        res.json(status);
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to fetch queue job status" });
    }
});

router.get("/queue/dead-letter", async (req, res) => {
    try {
        if (!authorizeQueueOperations(req as any, res)) {
            return;
        }
        if (!isQueueAvailable()) {
            return res.status(503).json({
                message: "Queue service unavailable",
                code: "QUEUE_UNAVAILABLE",
                queue: { available: false },
            });
        }

        const limit = Number(req.query.limit || 50);
        const [entries, reliability] = await Promise.all([
            getDeadLetterJobs(limit),
            getQueueReliabilityConfig(),
        ]);
        res.json({
            count: entries.length,
            entries,
            reliability,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to fetch dead-letter queue" });
    }
});

router.post("/queue/dead-letter/:entryId/replay", writeIdempotency, async (req, res) => {
    try {
        if (!authorizeQueueOperations(req as any, res)) {
            return;
        }
        if (!isQueueAvailable()) {
            return res.status(503).json({
                message: "Queue service unavailable",
                code: "QUEUE_UNAVAILABLE",
                queue: { available: false },
            });
        }

        const replay = await replayDeadLetterJob(req.params.entryId);
        res.status(202).json({
            success: true,
            ...replay,
        });
    } catch (error: any) {
        const message = error?.message || "Failed to replay dead-letter entry";
        const status = message.toLowerCase().includes("not found") ? 404 : 500;
        res.status(status).json({ message, code: status === 404 ? "QUEUE_DEAD_LETTER_NOT_FOUND" : "QUEUE_REPLAY_FAILED" });
    }
});

router.get("/credentials/:id", async (req, res) => {
    try {
        const credential = await storage.getCredential(req.params.id);

        if (!credential) {
            return res.status(404).json({ message: "Credential not found" });
        }

        const tenantId = (req as any).tenantId;
        if (credential.tenantId !== tenantId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        res.json(credential);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// List all credentials for tenant
router.get("/credentials", async (req, res) => {
    try {
        const tenantId = (req as any).tenantId;
        const credentials = await storage.listCredentials(tenantId);
        res.json(credentials);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Revoke a credential
router.post("/credentials/:id/revoke", writeIdempotency, async (req, res) => {
    try {
        if (!authorizeIssuanceWrite(req as any, res)) {
            return;
        }

        const credential = await storage.getCredential(req.params.id);

        if (!credential) {
            return res.status(404).json({ message: "Credential not found" });
        }

        const tenantId = (req as any).tenantId;
        if (credential.tenantId !== tenantId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const reason = req.body?.reason || "revoked_by_issuer";
        const revocation = await issuanceService.revokeCredential(req.params.id, reason);
        const status = revocation.alreadyRevoked ? await getCredentialStatus(req.params.id) : await revokeCredentialStatus(req.params.id);

        res.json({
            message: revocation.alreadyRevoked ? "Credential already revoked" : "Credential revoked successfully",
            id: req.params.id,
            status: status ? { list_id: status.listId, index: status.index, revoked: status.revoked } : null,
            code: revocation.alreadyRevoked ? "CREDENTIAL_ALREADY_REVOKED" : "CREDENTIAL_REVOKED",
        });
    } catch (error) {
        if (error instanceof RevocationError) {
            return res.status(error.status).json({ message: error.message, code: error.code });
        }
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;
