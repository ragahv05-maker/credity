import { Router } from "express";
import { verificationEngine } from "../services/verification-engine";
import { fraudDetector } from "../services/fraud-detector";
import { storage } from "../storage";

const router = Router();

// ============== Verification History & Analytics ==============

/**
 * Get verification history
 */
router.get("/verifications", async (req, res) => {
  try {
    const { limit = 50, status, startDate, endDate } = req.query;

    const results = await storage.getVerifications({
      status: status as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    const limitedResults = results.slice(0, parseInt(limit as string));

    res.json({
      success: true,
      total: results.length,
      results: limitedResults,
    });
  } catch (error) {
    console.error("Get verifications error:", error);
    res.status(500).json({ error: "Failed to get verifications" });
  }
});

/**
 * Get verification statistics
 */
router.get("/verifications/stats", async (req, res) => {
  try {
    const history = await storage.getVerifications();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayVerifications = history.filter((r) => r.timestamp >= today);

    const stats = {
      total: history.length,
      today: todayVerifications.length,
      verified: history.filter((r) => r.status === "verified").length,
      failed: history.filter((r) => r.status === "failed").length,
      suspicious: history.filter((r) => r.status === "suspicious").length,
      avgRiskScore:
        history.length > 0
          ? Math.round(
              history.reduce((sum, r) => sum + r.riskScore, 0) / history.length,
            )
          : 0,
      avgFraudScore:
        history.length > 0
          ? Math.round(
              history.reduce((sum, r) => sum + r.fraudScore, 0) /
                history.length,
            )
          : 0,
      recommendations: {
        approve: history.filter(
          (r) =>
            r.recommendation === "approve" || r.recommendation === "accept",
        ).length,
        review: history.filter((r) => r.recommendation === "review").length,
        reject: history.filter((r) => r.recommendation === "reject").length,
      },
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: "Failed to get statistics" });
  }
});

/**
 * Get single verification result
 */
router.get("/verifications/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const record = await storage.getVerification(id);
    const details = await verificationEngine.getVerificationResult(id);

    if (!record) {
      return res.status(404).json({ error: "Verification not found" });
    }

    res.json({
      success: true,
      record,
      details,
    });
  } catch (error) {
    console.error("Get verification error:", error);
    res.status(500).json({ error: "Failed to get verification" });
  }
});

// ============== Fraud Analytics ==============

/**
 * Get fraud statistics
 */
router.get("/fraud/stats", async (req, res) => {
  try {
    const stats = fraudDetector.getStatistics();
    const history = await storage.getVerifications();

    const flagDistribution = history.reduce(
      (acc, r) => {
        if (r.fraudScore >= 60) acc.high++;
        else if (r.fraudScore >= 30) acc.medium++;
        else acc.low++;
        return acc;
      },
      { high: 0, medium: 0, low: 0 },
    );

    res.json({
      success: true,
      stats,
      flagDistribution,
      recentFlagged: history.filter((r) => r.fraudScore >= 30).slice(0, 10),
    });
  } catch (error) {
    console.error("Get fraud stats error:", error);
    res.status(500).json({ error: "Failed to get fraud statistics" });
  }
});

export default router;
