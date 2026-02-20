// Initialize Sentry BEFORE importing anything else
import { initSentry, sentryErrorHandler } from "./services/sentry";
initSentry('credverse-wallet');

// Initialize PostHog Analytics
import { initAnalytics } from "./services/analytics";
initAnalytics();
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { errorHandler } from "./middleware/error-handler";
import { deviceFingerprintMiddleware } from "./middleware/device-fingerprint";
import { setupSecurity } from "@credverse/shared-auth";
import { initAuth } from "@credverse/shared-auth";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import passport from "passport";

const app = express();
const httpServer = createServer(app);

const requireDatabase = process.env.NODE_ENV === 'production' || process.env.REQUIRE_DATABASE === 'true';
if (requireDatabase && !process.env.DATABASE_URL) {
  console.error('[Startup] REQUIRE_DATABASE policy is enabled but DATABASE_URL is missing.');
  process.exit(1);
}
if (requireDatabase) {
  console.log('[Startup] Database persistence policy is enforced.');
}
if (!process.env.DIGILOCKER_CLIENT_ID) {
  console.warn('[Startup] DIGILOCKER_CLIENT_ID is not set — DigiLocker integration will run in sandbox/mock mode. Set DIGILOCKER_CLIENT_ID and DIGILOCKER_CLIENT_SECRET for production.');
}

initAuth({
  jwtSecret: process.env.JWT_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  app: 'wallet',
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Setup shared security
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5000',
  'http://localhost:5001',
  'http://localhost:5002',
  'http://localhost:5003',
  'http://localhost:5173',
  'http://localhost:3000'
];

setupSecurity(app, { allowedOrigins });

app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Device fingerprinting (Agent 1) — must run before all routes
app.use(deviceFingerprintMiddleware);

// Passport for OAuth flows (Agent 1)
app.use(passport.initialize());

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Sentry error handler (must be before other error handlers)
  app.use(sentryErrorHandler);

  // Global Error Handler
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    port,
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
