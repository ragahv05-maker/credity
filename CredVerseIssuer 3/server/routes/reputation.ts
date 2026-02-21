import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { apiKeyOrAuthMiddleware } from "../auth";
import { getDb } from "../db";
import {
  platformAuthorities,
  reputationEvents,
  reputationScores,
  reputationShareGrants,
  reputationSignalSnapshots,
  reputationCategoryEnum,
  reputationVerticalEnum,
} from "@shared/schema";
import type { SafeDateScoreContract } from "@credverse/shared-auth";
import { createReputationGraphService } from "../services/reputation-graph";
import { mapReputationEventToGraphEdge } from "../services/reputation-graph-event-mapper";

const router = Router();
const reputationGraphService = createReputationGraphService();

async function writeReputationGraphEdgeSafe(
  graphEdge: Parameters<typeof reputationGraphService.writeEdge>[0],
): Promise<{ accepted: boolean; reason?: string }> {
  try {
    return await reputationGraphService.writeEdge(graphEdge);
  } catch {
    return { accepted: false, reason: "reputation_graph_write_failed" };
  }
}

async function getReputationGraphSnapshotSafe(
  query: Parameters<typeof reputationGraphService.getSnapshot>[0],
): Promise<{
  snapshot: Awaited<ReturnType<typeof reputationGraphService.getSnapshot>>;
  reason?: string;
}> {
  try {
    const snapshot = await reputationGraphService.getSnapshot(query);
    return { snapshot };
  } catch {
    return { snapshot: null, reason: "reputation_graph_snapshot_failed" };
  }
}

type ReputationCategory = (typeof reputationCategoryEnum.enumValues)[number];
type ReputationVertical = (typeof reputationVerticalEnum.enumValues)[number];

const CATEGORY_WEIGHTS: Record<string, number> = {
  transport: 0.15,
  accommodation: 0.15,
  delivery: 0.1,
  employment: 0.2,
  finance: 0.15,
  social: 0.1,
  identity: 0.15,
};

const HARASSMENT_SIGNALS = new Set<string>([
  "harassment_report",
  "abuse_report",
]);
const SEVERE_BACKGROUND_SIGNALS = new Set<string>([
  "fraud_report",
  "chargeback_fraud",
  "policy_ban",
  "criminal_flag",
]);
const SOCIAL_VALIDATION_SIGNALS = new Set<string>([
  "endorsement",
  "positive_feedback",
  "verified_reference",
]);

type SafeDateBreakdown = SafeDateScoreContract["breakdown"];

function normalizeSubjectDid(payload: any): string | null {
  return (
    payload.subjectDid ||
    payload.subject_did ||
    (payload.user_id !== undefined ? String(payload.user_id) : null)
  );
}

function normalizePlatformId(payload: any): string | null {
  return payload.platform_id || payload.platformId || null;
}

function normalizeCategory(payload: any): ReputationCategory | null {
  const raw = payload.category;
  if (typeof raw !== "string") return null;
  return raw as ReputationCategory;
}

function normalizeSignalType(payload: any): string | null {
  return payload.signal_type || payload.signalType || null;
}

function readScore(payload: any): number | null {
  if (payload.score === undefined || payload.score === null) return null;
  const parsed = Number(payload.score);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function parseLimit(value: unknown, fallback = 100, max = 500): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), max);
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function toUserId(subjectDid: string, fallback?: number): number {
  if (
    typeof fallback === "number" &&
    Number.isFinite(fallback) &&
    fallback > 0
  ) {
    return Math.floor(fallback);
  }
  const parsed = Number(subjectDid);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return 0;
}

function hasSignal(
  event: { signalType?: string | null },
  signal: string,
): boolean {
  return (event.signalType || "").toLowerCase() === signal;
}

function getStringFromQuery(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getSubjectDidFromQuery(query: Record<string, unknown>): string | null {
  return (
    getStringFromQuery(query.subjectDid) ||
    getStringFromQuery(query.subject_did) ||
    (query.userId !== undefined ? String(query.userId) : null) ||
    (query.user_id !== undefined ? String(query.user_id) : null)
  );
}

function buildCategoryBreakdown(
  events: Array<{ category: string; score: number }>,
) {
  const categoryBuckets: Record<string, { total: number; count: number }> = {};
  for (const event of events) {
    const bucket = categoryBuckets[event.category] || { total: 0, count: 0 };
    bucket.total += event.score;
    bucket.count += 1;
    categoryBuckets[event.category] = bucket;
  }

  return Object.entries(CATEGORY_WEIGHTS).map(([category, weight]) => {
    const bucket = categoryBuckets[category] || { total: 0, count: 0 };
    const score = bucket.count === 0 ? 0 : bucket.total / bucket.count;
    return {
      category,
      weight,
      score: Math.round(score),
      weighted_score: Math.round(score * weight),
      event_count: bucket.count,
    };
  });
}

function calculateSafeDateScore(
  userId: number,
  reputationScore: number,
  events: Array<{ signalType: string; score: number; category: string }>,
): SafeDateScoreContract {
  const identityVerified = events.some((event) => {
    if (event.category !== "identity") return false;
    const signal = event.signalType.toLowerCase();
    return (
      (signal === "identity_verified" || signal === "kyc_verified") &&
      event.score >= 60
    );
  });
  const livenessVerified = events.some((event) =>
    hasSignal(event, "liveness_passed"),
  );

  let backgroundFlags = 0;
  let endorsementCount = 0;
  let harassmentReports = 0;

  for (const event of events) {
    const signal = event.signalType.toLowerCase();
    if (SEVERE_BACKGROUND_SIGNALS.has(signal)) backgroundFlags += 1;
    if (SOCIAL_VALIDATION_SIGNALS.has(signal)) endorsementCount += 1;
    if (HARASSMENT_SIGNALS.has(signal)) harassmentReports += 1;
  }

  const breakdown: SafeDateBreakdown = {
    identity_verified_points: identityVerified ? 25 : 0,
    liveness_points: livenessVerified ? 15 : 0,
    background_clean_points:
      backgroundFlags === 0
        ? 20
        : Math.max(0, 20 - Math.min(backgroundFlags * 10, 20)),
    cross_platform_reputation_points: Math.round((reputationScore / 1000) * 20),
    social_validation_points: Math.min(endorsementCount * 2, 10),
    harassment_free_points:
      harassmentReports === 0
        ? 10
        : Math.max(0, 10 - Math.min(harassmentReports * 5, 10)),
  };

  const reasonCodes: string[] = [];
  if (!identityVerified) reasonCodes.push("identity_not_verified");
  if (!livenessVerified) reasonCodes.push("liveness_not_verified");
  if (backgroundFlags > 0) reasonCodes.push("background_flags_present");
  if (harassmentReports > 0) reasonCodes.push("harassment_reports_present");
  if (breakdown.social_validation_points < 4)
    reasonCodes.push("low_social_validation");

  const score = Math.max(
    0,
    Math.min(
      100,
      breakdown.identity_verified_points +
        breakdown.liveness_points +
        breakdown.background_clean_points +
        breakdown.cross_platform_reputation_points +
        breakdown.social_validation_points +
        breakdown.harassment_free_points,
    ),
  );

  return {
    user_id: userId,
    score,
    breakdown,
    computed_at: new Date().toISOString(),
    reason_codes: reasonCodes,
  };
}

async function ensureDb(res: any) {
  const db = getDb();
  if (!db) {
    res.status(503).json({ error: "Database unavailable" });
    return null;
  }
  return db;
}

async function getPlatformAuthority(db: any, platformId: string) {
  const rows = await db
    .select()
    .from(platformAuthorities)
    .where(eq(platformAuthorities.platformId, platformId))
    .limit(1);
  return rows[0] || null;
}

router.post("/reputation/events", apiKeyOrAuthMiddleware, async (req, res) => {
  const db = await ensureDb(res);
  if (!db) return;

  const subjectDid = normalizeSubjectDid(req.body);
  const platformId = normalizePlatformId(req.body);
  const category = normalizeCategory(req.body);
  const signalType = normalizeSignalType(req.body);
  const score = readScore(req.body);

  if (
    !subjectDid ||
    !platformId ||
    !category ||
    !signalType ||
    score === null
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (score < 0 || score > 100) {
    return res.status(400).json({ error: "Score must be between 0 and 100" });
  }

  const categoryList = reputationCategoryEnum.enumValues;
  if (!categoryList.includes(category)) {
    return res.status(400).json({ error: "Invalid category" });
  }

  const apiKeyHeader = req.headers["x-api-key"];
  if (apiKeyHeader && typeof apiKeyHeader === "string") {
    const authority = await getPlatformAuthority(db, platformId);
    if (!authority || authority.status !== "active") {
      return res.status(403).json({ error: "Platform not authorized" });
    }
    const allowedCategories = (authority.allowedCategories || []) as string[];
    if (allowedCategories.length > 0 && !allowedCategories.includes(category)) {
      return res
        .status(403)
        .json({ error: "Platform not authorized for category" });
    }
  }

  const eventId = req.body.event_id || randomUUID();
  const existing = await db
    .select()
    .from(reputationEvents)
    .where(eq(reputationEvents.eventId, eventId))
    .limit(1);

  if (existing[0]) {
    return res.status(200).json({
      success: true,
      event: existing[0],
      graph: { accepted: false, reason: "duplicate_event_skipped" },
    });
  }

  const occurredAt = req.body.occurred_at
    ? new Date(req.body.occurred_at)
    : new Date();
  const [inserted] = await db
    .insert(reputationEvents)
    .values({
      eventId,
      subjectDid,
      platformId,
      category,
      signalType,
      score,
      occurredAt,
      metadata: req.body.metadata || {},
    })
    .returning();

  const graphEdge = mapReputationEventToGraphEdge({
    eventId,
    subjectDid,
    platformId,
    category,
    signalType,
    score,
    occurredAt: toIsoString(occurredAt),
  });

  const graph = await writeReputationGraphEdgeSafe(graphEdge);

  return res.status(201).json({ success: true, event: inserted, graph });
});

router.get("/reputation/events", apiKeyOrAuthMiddleware, async (req, res) => {
  const db = await ensureDb(res);
  if (!db) return;

  const query = req.query as Record<string, unknown>;
  const subjectDid = getSubjectDidFromQuery(query);
  const category = normalizeCategory(query);
  const limit = parseLimit(query.limit, 100, 500);

  if (!subjectDid) {
    return res
      .status(400)
      .json({ error: "Missing subjectDid/userId query parameter" });
  }
  if (category && !reputationCategoryEnum.enumValues.includes(category)) {
    return res.status(400).json({ error: "Invalid category" });
  }

  const rows = await db
    .select()
    .from(reputationEvents)
    .where(eq(reputationEvents.subjectDid, subjectDid))
    .orderBy(desc(reputationEvents.occurredAt))
    .limit(limit);

  const filtered = category
    ? rows.filter((row: any) => row.category === category)
    : rows;
  const preferredUserId = Number(query.userId ?? query.user_id);
  const events = filtered.map((row: any) => ({
    id: row.id,
    event_id: row.eventId || row.id,
    user_id: toUserId(row.subjectDid, preferredUserId),
    platform_id: row.platformId,
    category: row.category,
    signal_type: row.signalType,
    score: row.score,
    occurred_at: toIsoString(row.occurredAt),
    metadata: row.metadata || {},
    created_at: toIsoString(row.createdAt),
  }));

  return res.status(200).json({ success: true, count: events.length, events });
});

router.get(
  "/reputation/events/:id",
  apiKeyOrAuthMiddleware,
  async (req, res) => {
    const db = await ensureDb(res);
    if (!db) return;

    const [event] = await db
      .select()
      .from(reputationEvents)
      .where(eq(reputationEvents.id, req.params.id))
      .limit(1);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    return res.status(200).json({ success: true, event });
  },
);

router.get("/reputation/score", apiKeyOrAuthMiddleware, async (req, res) => {
  const db = await ensureDb(res);
  if (!db) return;

  const query = req.query as Record<string, unknown>;
  const subjectDid = getSubjectDidFromQuery(query);
  if (!subjectDid) {
    return res
      .status(400)
      .json({ error: "Missing subjectDid/userId query parameter" });
  }

  const verticalRaw = getStringFromQuery(query.vertical) || "overall";
  if (
    !reputationVerticalEnum.enumValues.includes(
      verticalRaw as ReputationVertical,
    )
  ) {
    return res.status(400).json({ error: "Invalid vertical" });
  }
  const vertical = verticalRaw as ReputationVertical;

  const [latest] = await db
    .select()
    .from(reputationScores)
    .where(eq(reputationScores.subjectDid, subjectDid))
    .orderBy(desc(reputationScores.computedAt))
    .limit(1);

  const preferredUserId = Number(query.userId ?? query.user_id);
  if (latest) {
    return res.status(200).json({
      success: true,
      reputation: {
        user_id: toUserId(subjectDid, preferredUserId),
        subject_did: subjectDid,
        score: latest.score,
        event_count: latest.eventCount,
        category_breakdown: latest.breakdown || [],
        computed_at: toIsoString(latest.computedAt),
        vertical: latest.vertical,
      },
    });
  }

  const events = await db
    .select()
    .from(reputationEvents)
    .where(eq(reputationEvents.subjectDid, subjectDid));
  const breakdown = buildCategoryBreakdown(
    events.map((event: any) => ({
      category: event.category,
      score: event.score,
    })),
  );
  const score = Math.max(
    0,
    Math.min(
      1000,
      Math.round(
        breakdown.reduce((sum, item) => sum + item.weighted_score, 0) * 10,
      ),
    ),
  );

  return res.status(200).json({
    success: true,
    reputation: {
      user_id: toUserId(subjectDid, preferredUserId),
      subject_did: subjectDid,
      score,
      event_count: events.length,
      category_breakdown: breakdown,
      computed_at: new Date().toISOString(),
      vertical,
    },
  });
});

router.get(
  "/reputation/graph/snapshot",
  apiKeyOrAuthMiddleware,
  async (req, res) => {
    const query = req.query as Record<string, unknown>;
    const subjectDid = getSubjectDidFromQuery(query);
    if (!subjectDid) {
      return res
        .status(400)
        .json({ error: "Missing subjectDid/userId query parameter" });
    }

    const asOf = getStringFromQuery(query.asOf) || undefined;
    const graph = await getReputationGraphSnapshotSafe({ subjectDid, asOf });

    return res
      .status(200)
      .json({
        success: true,
        snapshot: graph.snapshot,
        graph: graph.reason
          ? { accepted: false, reason: graph.reason }
          : undefined,
      });
  },
);

router.get("/reputation/safedate", apiKeyOrAuthMiddleware, async (req, res) => {
  const db = await ensureDb(res);
  if (!db) return;

  const query = req.query as Record<string, unknown>;
  const subjectDid = getSubjectDidFromQuery(query);
  if (!subjectDid) {
    return res
      .status(400)
      .json({ error: "Missing subjectDid/userId query parameter" });
  }

  const [latestScore] = await db
    .select()
    .from(reputationScores)
    .where(eq(reputationScores.subjectDid, subjectDid))
    .orderBy(desc(reputationScores.computedAt))
    .limit(1);

  const events = await db
    .select()
    .from(reputationEvents)
    .where(eq(reputationEvents.subjectDid, subjectDid));

  const score1000 =
    latestScore?.score ??
    Math.max(
      0,
      Math.min(
        1000,
        Math.round(
          buildCategoryBreakdown(
            events.map((event: any) => ({
              category: event.category,
              score: event.score,
            })),
          ).reduce((sum, item) => sum + item.weighted_score, 0) * 10,
        ),
      ),
    );

  const preferredUserId = Number(query.userId ?? query.user_id);
  const safeDate = calculateSafeDateScore(
    toUserId(subjectDid, preferredUserId),
    score1000,
    events.map((event: any) => ({
      signalType: event.signalType,
      score: event.score,
      category: event.category,
    })),
  );

  return res.status(200).json({ success: true, safe_date: safeDate });
});

router.get(
  "/reputation/scores/:subjectDid",
  apiKeyOrAuthMiddleware,
  async (req, res) => {
    const db = await ensureDb(res);
    if (!db) return;

    const subjectDid = req.params.subjectDid;
    const scores = await db
      .select()
      .from(reputationScores)
      .where(eq(reputationScores.subjectDid, subjectDid))
      .orderBy(desc(reputationScores.computedAt));

    return res.status(200).json({ success: true, scores });
  },
);

router.get(
  "/reputation/profiles/:subjectDid",
  apiKeyOrAuthMiddleware,
  async (req, res) => {
    const db = await ensureDb(res);
    if (!db) return;

    const subjectDid = req.params.subjectDid;
    const scores = await db
      .select()
      .from(reputationScores)
      .where(eq(reputationScores.subjectDid, subjectDid))
      .orderBy(desc(reputationScores.computedAt));

    const [signals] = await db
      .select()
      .from(reputationSignalSnapshots)
      .where(eq(reputationSignalSnapshots.subjectDid, subjectDid))
      .orderBy(desc(reputationSignalSnapshots.computedAt))
      .limit(1);

    return res.status(200).json({
      success: true,
      profile: {
        subject_did: subjectDid,
        scores,
        signals: signals?.signals || null,
        signals_version: signals?.signalsVersion || null,
        computed_at: signals?.computedAt || null,
      },
    });
  },
);

router.post(
  "/reputation/share-grants",
  apiKeyOrAuthMiddleware,
  async (req, res) => {
    const db = await ensureDb(res);
    if (!db) return;

    const subjectDid = normalizeSubjectDid(req.body);
    const granteeId = req.body.grantee_id || req.body.granteeId;
    const purpose = req.body.purpose;
    const expiresAt = req.body.expires_at || req.body.expiresAt;

    if (!subjectDid || !granteeId || !purpose || !expiresAt) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [grant] = await db
      .insert(reputationShareGrants)
      .values({
        subjectDid,
        granteeId,
        purpose,
        dataElements: req.body.data_elements || req.body.dataElements || [],
        expiresAt: new Date(expiresAt),
      })
      .returning();

    return res.status(201).json({ success: true, grant });
  },
);

router.post(
  "/reputation/share-grants/:id/revoke",
  apiKeyOrAuthMiddleware,
  async (req, res) => {
    const db = await ensureDb(res);
    if (!db) return;

    const [grant] = await db
      .update(reputationShareGrants)
      .set({ revokedAt: new Date() })
      .where(eq(reputationShareGrants.id, req.params.id))
      .returning();

    if (!grant) {
      return res.status(404).json({ error: "Share grant not found" });
    }

    return res.status(200).json({ success: true, grant });
  },
);

router.post(
  "/reputation/scores/recompute",
  apiKeyOrAuthMiddleware,
  async (req, res) => {
    const db = await ensureDb(res);
    if (!db) return;

    const subjectDid = normalizeSubjectDid(req.body);
    const verticalRaw = req.body.vertical || "overall";

    if (!subjectDid) {
      return res.status(400).json({ error: "Missing subjectDid" });
    }

    const verticalList = reputationVerticalEnum.enumValues;
    if (!verticalList.includes(verticalRaw as ReputationVertical)) {
      return res.status(400).json({ error: "Invalid vertical" });
    }
    const vertical = verticalRaw as ReputationVertical;

    const events = await db
      .select()
      .from(reputationEvents)
      .where(eq(reputationEvents.subjectDid, subjectDid));
    const breakdown = buildCategoryBreakdown(
      events.map((event: any) => ({
        category: event.category,
        score: event.score,
      })),
    );

    const weightedScore = breakdown.reduce(
      (sum, item) => sum + item.weighted_score,
      0,
    );
    const finalScore = Math.round(weightedScore * 10);

    const [inserted] = await db
      .insert(reputationScores)
      .values({
        subjectDid,
        vertical,
        score: finalScore,
        eventCount: events.length,
        breakdown,
      })
      .returning();

    const [signals] = await db
      .insert(reputationSignalSnapshots)
      .values({
        subjectDid,
        signals: breakdown,
        signalsVersion: "v1",
      })
      .returning();

    return res.status(200).json({
      success: true,
      score: inserted,
      signals,
    });
  },
);

export default router;
