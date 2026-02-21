import type { Express } from "express";
import { type Server } from "http";
import verificationRoutes from "./routes/verification";
import analyticsRoutes from "./routes/analytics";
import authRoutes from "./routes/auth";
import complianceRoutes from "./routes/compliance";
import claimsProxyRoutes from "./routes/claims-proxy";
import workScoreRoutes from "./routes/workscore";
import safeDateRoutes from "./routes/safedate";
import proofRoutes from "./routes/proofs";
import { blockchainService } from "./services/blockchain-service";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Health check endpoint for Railway
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      app: "recruiter",
      timestamp: new Date().toISOString(),
      blockchain: blockchainService.getRuntimeStatus(),
    });
  });

  // Verification routes
  app.use("/api", verificationRoutes);
  app.use("/api", analyticsRoutes);
  app.use("/api", authRoutes);
  app.use("/api", complianceRoutes);
  app.use("/api", claimsProxyRoutes);
  app.use("/api", workScoreRoutes);
  app.use("/api", safeDateRoutes);
  app.use("/api", proofRoutes);

  return httpServer;
}
