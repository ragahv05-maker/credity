import { Router } from "express";
import { storage } from "../storage";
import { apiKeyMiddleware } from "../auth";

const router = Router();

router.use("/analytics", apiKeyMiddleware);

router.get("/analytics", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;

    // In a real DB, we would use aggregation queries.
    // For MemStorage, we'll filter in memory.
    const allCredentials = await storage.listCredentials(tenantId);

    const totalIssued = allCredentials.length;
    const revokedCount = allCredentials.filter((c) => c.revoked).length;
    const activeCount = totalIssued - revokedCount;

    // Calculate monthly trends (mock logic for now as we don't have historical data in MemStorage easily accessible in this format)
    // In production: SELECT date_trunc('month', issuance_date) as month, count(*) ...
    const monthlyTrends = [
      { month: "Jan", issued: Math.floor(totalIssued * 0.1) },
      { month: "Feb", issued: Math.floor(totalIssued * 0.15) },
      { month: "Mar", issued: Math.floor(totalIssued * 0.2) },
      { month: "Apr", issued: Math.floor(totalIssued * 0.1) },
      { month: "May", issued: Math.floor(totalIssued * 0.25) },
      { month: "Jun", issued: Math.floor(totalIssued * 0.2) },
    ];

    res.json({
      stats: [
        {
          label: "Total Credentials Issued",
          value: totalIssued.toString(),
          change: "+12% this month",
        },
        {
          label: "Active Credentials",
          value: activeCount.toString(),
          change: "98% valid",
        },
        {
          label: "Revoked Credentials",
          value: revokedCount.toString(),
          change: "0.02% rate",
        },
        {
          label: "Verification Rate",
          value: "98.5%",
          change: "+2% vs last year",
        },
      ],
      chartData: monthlyTrends,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
