// Initialize Sentry BEFORE importing anything else
import { initSentry, sentryErrorHandler } from "./services/sentry";
initSentry('credverse-issuer');

// Initialize PostHog Analytics
import { initAnalytics } from "./services/analytics";
initAnalytics();
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { initAuth } from "@credverse/shared-auth";
import { errorHandler } from "./middleware/error-handler";
import {
  apiRateLimiter,
  hppProtection,
  sanitizationMiddleware,
  requestIdMiddleware,
  additionalSecurityHeaders,
  suspiciousRequestDetector,
  ipBlocklistMiddleware,
} from "./middleware/security";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

const requireDatabase = process.env.NODE_ENV === 'production' || process.env.REQUIRE_DATABASE === 'true';
const requireQueue = process.env.NODE_ENV === 'production' || process.env.REQUIRE_QUEUE === 'true';

if (requireDatabase && !process.env.DATABASE_URL) {
  console.error('[Startup] REQUIRE_DATABASE policy is enabled but DATABASE_URL is missing.');
  process.exit(1);
}
if (requireQueue && !process.env.REDIS_URL) {
  console.error('[Startup] REQUIRE_QUEUE policy is enabled but REDIS_URL is missing.');
  process.exit(1);
}
if (requireDatabase) {
  console.log('[Startup] Database persistence policy is enforced.');
}
if (requireQueue) {
  console.log('[Startup] Queue-backed processing policy is enforced.');
}

initAuth({
  jwtSecret: process.env.JWT_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  app: 'issuer',
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Security headers - disable CSP in development for Vite HMR compatibility
const isDev = process.env.NODE_ENV !== 'production';
app.use(helmet({
  contentSecurityPolicy: isDev ? false : undefined,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: isDev ? false : undefined,
  crossOriginResourcePolicy: isDev ? false : undefined,
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5000',
  'http://localhost:5001',
  'http://localhost:5002',
  'http://localhost:5003',
  'http://localhost:5173',
  'http://localhost:3000'
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'Idempotency-Key',
    'X-Webhook-Signature',
    'X-Webhook-Timestamp',
  ],
}));

app.use(
  express.json({
    limit: '10mb', // Prevent large payload DoS
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Advanced security middleware
app.use(requestIdMiddleware);           // Add request ID for audit logging
app.use(ipBlocklistMiddleware);         // Block banned IPs
app.use(hppProtection);                 // Prevent HTTP Parameter Pollution
app.use(sanitizationMiddleware);        // Sanitize all input
app.use(suspiciousRequestDetector);     // Detect SQL injection, XSS, etc.
app.use(additionalSecurityHeaders);     // Additional security headers
app.use('/api', apiRateLimiter);        // Rate limit API routes

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
