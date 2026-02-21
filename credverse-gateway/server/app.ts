import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import mobileProxyRoutes from "./routes/mobile-proxy";
import { initGoogleOAuth } from "./services/google";
import { errorHandler } from "./middleware/error-handler";
import { ERROR_CODES } from "./services/observability";
import { setupSecurity } from "@credverse/shared-auth";
import { sentryErrorHandler } from "./services/sentry";
import { metricsHandler, telemetryMiddleware } from "./services/telemetry";

export function createGatewayApp() {
  const app = express();
  app.set("trust proxy", 1);

  setupSecurity(app, {
    allowedOrigins: [
      "http://localhost:5173",
      "http://localhost:5000",
      "http://localhost:5001",
      "http://localhost:5002",
      "http://localhost:5003",
    ],
  });

  app.use(express.json({ limit: "64kb" }));
  app.use(cookieParser());
  app.use(telemetryMiddleware("credverse-gateway"));
  app.get("/api/metrics", metricsHandler("credverse-gateway"));

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleRedirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:5173/api/auth/google/callback";

  if (googleClientId && googleClientSecret) {
    initGoogleOAuth({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      redirectUri: googleRedirectUri,
    });
    console.log("[Gateway] Google OAuth configured");
  } else {
    console.warn(
      "[Gateway] Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    );
  }

  app.use("/api", authRoutes);
  app.use("/api/mobile", mobileProxyRoutes);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "credverse-gateway" });
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({
      message: "API route not found",
      code: ERROR_CODES.NOT_FOUND,
    });
  });

  app.use(sentryErrorHandler);
  app.use(errorHandler);

  return app;
}
