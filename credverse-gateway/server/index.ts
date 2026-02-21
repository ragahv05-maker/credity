/**
 * CredVerse Gateway - Express Backend Server with Vite Frontend
 */

// Initialize Sentry BEFORE importing anything else
import { initSentry } from "./services/sentry";
initSentry("credverse-gateway");

import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createGatewayApp } from "./app";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = createGatewayApp();
const httpServer = createServer(app);

const gatewayHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CredVerse Gateway</title>
</head>
<body>
    <h1>CredVerse Gateway</h1>
    <p>Gateway server is running.</p>
</body>
</html>
`;

(async () => {
  if (process.env.NODE_ENV !== "production") {
    try {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
      console.log("[Gateway] Vite dev server attached");
    } catch {
      console.log("[Gateway] Vite unavailable, using inline HTML fallback");
      app.get("/", (_req, res) => {
        res.setHeader("Content-Type", "text/html");
        res.send(gatewayHTML);
      });
    }
  } else {
    app.use(express.static(path.join(__dirname, "../dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "../dist/index.html"));
    });
  }

  const port = parseInt(process.env.PORT || "5173", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`[Gateway] Server running on port ${port}`);
  });
})();
