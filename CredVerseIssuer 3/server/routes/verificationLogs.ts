import { Router } from "express";
import { storage } from "../storage";
import { apiKeyMiddleware } from "../auth";

const router = Router();
router.use("/verification-logs", apiKeyMiddleware);

// List verification logs
router.get("/verification-logs", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const logs = await storage.listVerificationLogs(tenantId);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch verification logs" });
  }
});

// Get verification stats
router.get("/verification-logs/stats", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const stats = await storage.getVerificationStats(tenantId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// Create verification log (called by verify endpoint)
router.post("/verification-logs", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { credentialId, verifierName, verifierLocation, status, ipAddress } =
      req.body;

    const log = await storage.createVerificationLog({
      tenantId,
      credentialId,
      verifierName: verifierName || "Unknown",
      verifierIp: ipAddress || req.ip || "0.0.0.0",
      location: verifierLocation || "Unknown",
      status: status === "success" ? "verified" : status || "verified",
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: "Failed to create log" });
  }
});

export default router;
