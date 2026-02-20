import { Router, type Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import userRoutes from "./routes/user";
import digilockerRouter from "./routes/digilocker";
import authRoutes from "./routes/auth";
import walletRoutes from "./routes/wallet";
import credentialsRoutes from "./routes/credentials";
import sharingRoutes from "./routes/sharing";
import notificationsRoutes from "./routes/notifications";
import trustScoreRoutes from "./routes/trust-score";
import connectionsRoutes from "./routes/connections";
import claimsRoutes from "./routes/claims";
import identityRoutes from "./routes/identity";
import reputationRoutes from "./routes/reputation";
import complianceRoutes from "./routes/compliance";

const LEGACY_API_SUNSET_HEADER =
  process.env.API_LEGACY_SUNSET ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();

function withLegacyDeprecation(routeHandler: Router, successorPath: string): Router {
  const alias = Router();
  alias.use((_req, res, next) => {
    res.setHeader("Deprecation", "true");
    res.setHeader("Sunset", LEGACY_API_SUNSET_HEADER);
    res.setHeader("Link", `<${successorPath}>; rel="successor-version"`);
    next();
  });
  alias.use(routeHandler);
  return alias;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const allowDemoRoutes =
    process.env.NODE_ENV !== "production" && process.env.ALLOW_DEMO_ROUTES === "true";

  // Health check endpoint for Railway
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Canonical V1 routes
  app.use("/api/v1", authRoutes);
  app.use("/api/v1", walletRoutes);
  app.use("/api/v1", credentialsRoutes);
  app.use("/api/v1", sharingRoutes);
  app.use("/api/v1", notificationsRoutes);
  app.use("/api/v1", userRoutes);
  app.use("/api/v1", digilockerRouter);
  app.use("/api/v1/trust-score", trustScoreRoutes);
  app.use("/api/v1/reputation", reputationRoutes);
  app.use("/api/v1", complianceRoutes);
  app.use("/api/v1/connections", connectionsRoutes);
  app.use("/api/v1/identity", identityRoutes);

  // Deprecated legacy aliases (/api/*)
  app.use("/api", withLegacyDeprecation(authRoutes, "/api/v1/auth"));
  app.use("/api", withLegacyDeprecation(walletRoutes, "/api/v1/wallet"));
  app.use("/api", withLegacyDeprecation(credentialsRoutes, "/api/v1/wallet/credentials"));
  app.use("/api", withLegacyDeprecation(sharingRoutes, "/api/v1/wallet/share"));
  app.use("/api", withLegacyDeprecation(notificationsRoutes, "/api/v1/inbox"));
  app.use("/api", withLegacyDeprecation(userRoutes, "/api/v1/user"));
  app.use("/api", digilockerRouter);
  app.use("/api/trust-score", withLegacyDeprecation(trustScoreRoutes, "/api/v1/trust-score"));
  app.use("/api/reputation", withLegacyDeprecation(reputationRoutes, "/api/v1/reputation"));
  app.use("/api", withLegacyDeprecation(complianceRoutes, "/api/v1/compliance"));
  app.use("/api/connections", withLegacyDeprecation(connectionsRoutes, "/api/v1/connections"));
  if (allowDemoRoutes) {
    app.use("/api/v1/claims", claimsRoutes);      // Claims Verification API (B2B demo path)
  } else {
    app.use("/api/v1/claims", (_req, res) => {
      res.status(503).json({
        error: "Claims verification demo module is disabled.",
        hint: "Enable ALLOW_DEMO_ROUTES=true in non-production to access demo claims routes.",
      });
    });
  }
  app.use("/api/identity", withLegacyDeprecation(identityRoutes, "/api/v1/identity"));

  return httpServer;
}
