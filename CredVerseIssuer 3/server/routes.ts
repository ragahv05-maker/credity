import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import registryRoutes from "./routes/registry";
import templateRoutes from "./routes/templates";
import issuanceRoutes from "./routes/issuance";
import verifyRoutes from "./routes/verify";
import analyticsRoutes from "./routes/analytics";
import studentsRoutes from "./routes/students";
import teamRoutes from "./routes/team";
import templateDesignsRoutes from "./routes/templateDesigns";
import verificationLogsRoutes from "./routes/verificationLogs";
import exportsRoutes from "./routes/exports";
import activityLogsRoutes from "./routes/activityLogs";
import digilockerRoutes from "./routes/digilocker";
import standardsRoutes from "./routes/standards";
import authRoutes from "./routes/auth";
import publicRoutes from "./routes/public";
import twoFactorRoutes from "./routes/two-factor";
import reputationRoutes from "./routes/reputation";
import complianceRoutes from "./routes/compliance";
import { initQueueService, startIssuanceWorker, getQueueStats, getDeadLetterJobs, getQueueReliabilityConfig, isQueueAvailable } from "./services/queue-service";
import { issuanceService } from "./services/issuance";
import { blockchainService } from "./services/blockchain-service";

import { setupSecurity } from "@credverse/shared-auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Apply shared security middleware (Helmet, CORS, Rate Limit, WAF)
  setupSecurity(app);

  // Initialize queue service for bulk operations
  const queueAvailable = await initQueueService();
  if (queueAvailable) {
    // Start the worker to process bulk issuance jobs
    startIssuanceWorker(async (tenantId, templateId, issuerId, recipient, data) => {
      await issuanceService.issueCredential(tenantId, templateId, issuerId, recipient, data);
    });
  }

  // Health check endpoint for Railway
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      app: "issuer",
      timestamp: new Date().toISOString(),
      queue: {
        available: queueAvailable,
      },
      blockchain: blockchainService.getRuntimeStatus(),
    });
  });

  // Detailed queue health endpoint (M-4)
  app.get("/api/health/queue", async (_req, res) => {
    try {
      const [stats, reliabilityConfig, deadLetterSample] = await Promise.all([
        getQueueStats(),
        getQueueReliabilityConfig(),
        getDeadLetterJobs(5),
      ]);
      res.json({
        available: isQueueAvailable(),
        stats,
        reliabilityConfig,
        deadLetterCount: deadLetterSample.length,
        recentDeadLetterIds: deadLetterSample.map((e) => e.id),
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(503).json({
        available: false,
        error: err?.message || 'Queue health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Relayer / blockchain config validation endpoint (L-3)
  app.get("/api/health/relayer", (_req, res) => {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || process.env.POLYGON_RPC_URL || '';
    const privateKey = process.env.RELAYER_PRIVATE_KEY || '';
    const contractAddress = process.env.REGISTRY_CONTRACT_ADDRESS || '';
    const runtimeStatus = blockchainService.getRuntimeStatus();

    const missingVars: string[] = [];
    if (!rpcUrl) missingVars.push('BLOCKCHAIN_RPC_URL');
    if (!privateKey) missingVars.push('RELAYER_PRIVATE_KEY');
    if (!contractAddress) missingVars.push('REGISTRY_CONTRACT_ADDRESS');

    const ok = runtimeStatus.configured && missingVars.length === 0;
    res.status(ok ? 200 : 503).json({
      ok,
      configured: runtimeStatus.configured,
      writesAllowed: runtimeStatus.writesAllowed,
      chainNetwork: runtimeStatus.chainNetwork,
      networkName: runtimeStatus.networkName,
      missingEnvVars: missingVars,
      writePolicyReason: runtimeStatus.writePolicyReason,
      timestamp: new Date().toISOString(),
    });
  });

  // put application routes here
  // prefix all routes with /api
  app.use("/", standardsRoutes); // OID4VCI metadata + standards endpoints
  app.use("/api/v1/public", publicRoutes); // Mount public routes
  // auth routes first
  app.use("/api/v1", authRoutes);
  app.use("/api/v1", twoFactorRoutes); // 2FA routes
  app.use("/api/v1", verifyRoutes);
  app.use("/api/v1", registryRoutes);
  app.use("/api/v1", templateRoutes);
  app.use("/api/v1", issuanceRoutes);
  app.use("/api/v1", analyticsRoutes);
  app.use("/api/v1", studentsRoutes);
  app.use("/api/v1", teamRoutes);
  app.use("/api/v1", templateDesignsRoutes);
  app.use("/api/v1", verificationLogsRoutes);
  app.use("/api/v1", exportsRoutes);
  app.use("/api/v1", activityLogsRoutes);
  app.use("/api/v1", digilockerRoutes);
  app.use("/api/v1", reputationRoutes);
  app.use("/api/v1", complianceRoutes);


  return httpServer;
}
