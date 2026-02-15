import { Router } from "express";

const router = Router();

type Period = "today" | "week" | "month";

function parsePeriod(value: unknown): Period {
  if (value === "week" || value === "month") return value;
  return "today";
}

function periodCutoff(period: Period): number {
  const now = new Date();
  switch (period) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start.getTime();
    }
    case "week":
      return now.getTime() - 7 * 24 * 60 * 60 * 1000;
    case "month":
      return now.getTime() - 30 * 24 * 60 * 60 * 1000;
  }
}

function getWalletBaseUrl(): string {
  return (
    process.env.WALLET_BASE_URL ||
    process.env.WALLET_API_URL ||
    process.env.WALLET_URL ||
    "http://localhost:5002"
  ).replace(/\/$/, "");
}

/**
 * GET /api/claims?period=today|week|month&limit=100
 *
 * Recruiter UI expects this route, but the claims engine lives in the wallet service.
 * This endpoint proxies and shapes wallet /api/v1/claims for the dashboard.
 */
router.get("/claims", async (req, res) => {
  try {
    const period = parsePeriod(req.query.period);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "100"), 10) || 100, 1), 500);

    const walletUrl = `${getWalletBaseUrl()}/api/v1/claims?limit=${encodeURIComponent(String(limit))}&offset=0`;
    const upstream = await fetch(walletUrl, {
      headers: {
        "content-type": "application/json",
        ...(req.headers["x-request-id"] ? { "x-request-id": String(req.headers["x-request-id"]) } : {}),
      },
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).send(text || "Upstream claims service unavailable");
    }

    const body = (await upstream.json()) as any;
    const claims: any[] = Array.isArray(body?.claims) ? body.claims : [];

    const cutoff = periodCutoff(period);
    const filtered = claims.filter((c) => {
      const createdAt = typeof c?.created_at === "string" ? Date.parse(c.created_at) : NaN;
      if (!Number.isFinite(createdAt)) return true;
      return createdAt >= cutoff;
    });

    const stats = {
      total: filtered.length,
      approved: filtered.filter((c) => c?.recommendation === "approve").length,
      review: filtered.filter((c) => c?.recommendation === "review").length,
      investigate: filtered.filter((c) => c?.recommendation === "investigate").length,
      rejected: filtered.filter((c) => c?.recommendation === "reject").length,
      avgTrustScore:
        filtered.length > 0
          ? Math.round(
              filtered.reduce((sum, c) => sum + (typeof c?.trust_score === "number" ? c.trust_score : 0), 0) /
                filtered.length
            )
          : 0,
    };

    return res.json({
      claims: filtered,
      stats,
    });
  } catch (error: any) {
    console.error("Claims proxy error:", error);
    return res.status(500).json({ error: "Failed to fetch claims" });
  }
});

export default router;
