import { randomUUID } from "crypto";
import { Router } from "express";
import { z } from "zod";
import {
  WORKSCORE_REASON_CODES,
  WORKSCORE_WEIGHTS,
} from "@credverse/shared-auth";
import { evaluateWorkScore } from "../services/workscore";
import { evaluateWorkScorePolicy } from "../services/workscore-policy-service";
import { deterministicHash } from "../services/proof-lifecycle";
import { storage } from "../storage";
import { authMiddleware, requireRole } from "../services/auth-service";

const router = Router();

const workScoreComponentSchema = z.number().min(0).max(1);

const workScorePayloadSchema = z
  .object({
    components: z
      .object({
        identity: workScoreComponentSchema.optional(),
        education: workScoreComponentSchema.optional(),
        employment: workScoreComponentSchema.optional(),
        reputation: workScoreComponentSchema.optional(),
        skills: workScoreComponentSchema.optional(),
        crossTrust: workScoreComponentSchema.optional(),
      })
      .strict()
      .optional(),
    reason_codes: z.array(z.enum(WORKSCORE_REASON_CODES)).optional(),
    evidence: z
      .object({
        summary: z.string().optional(),
        anchors_checked: z.array(z.string()).optional(),
        docs_checked: z.array(z.string()).optional(),
      })
      .strict()
      .optional(),
    candidate_id: z.string().trim().min(1).max(256).optional(),
    context: z.record(z.unknown()).optional(),
  })
  .strict();

router.post("/workscore/evaluate", async (req, res) => {
  const parsed = workScorePayloadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Invalid WorkScore request payload",
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const evaluation = evaluateWorkScore({
    components: parsed.data.components,
    reason_codes: parsed.data.reason_codes,
    evidence: parsed.data.evidence,
  });

  const policyEnabled = process.env.FEATURE_WORKSCORE_POLICY_ENGINE === "true";
  const policy = policyEnabled
    ? await evaluateWorkScorePolicy({
        score: evaluation.score,
        hasStrongEvidence:
          Boolean(parsed.data.evidence?.summary?.trim()) &&
          (parsed.data.evidence?.docs_checked?.length || 0) > 0,
        hasRiskSignals: (evaluation.reason_codes || []).includes(
          "CROSS_TRUST_LOW",
        ),
        candidateContext: parsed.data.context,
      })
    : null;

  const candidate_hash = parsed.data.candidate_id
    ? deterministicHash({ candidate_id: parsed.data.candidate_id }, "sha256")
    : undefined;

  const context_hash = deterministicHash(
    {
      components: parsed.data.components || {},
      reason_codes: parsed.data.reason_codes || [],
      evidence: parsed.data.evidence || {},
      context: parsed.data.context || null,
    },
    "sha256",
  );

  const effectiveDecision = policy ? policy.decision : evaluation.decision;
  const effectiveReasonCodes = Array.from(
    new Set([
      ...(evaluation.reason_codes || []),
      ...(policy?.reason_codes || []),
    ]),
  );

  await storage.addWorkScoreEvaluation({
    id: randomUUID(),
    candidate_hash,
    context_hash,
    score: evaluation.score,
    breakdown: evaluation.breakdown,
    decision: effectiveDecision,
    reason_codes: effectiveReasonCodes,
    evidence: evaluation.evidence,
    timestamp: new Date(),
  });

  return res.json({
    score: evaluation.score,
    breakdown: evaluation.breakdown,
    decision: effectiveDecision,
    reason_codes: effectiveReasonCodes,
    evidence: evaluation.evidence,
    policy: policy
      ? {
          enabled: true,
          matched_rules: policy.matched_rules,
        }
      : { enabled: false },
    orchestration: {
      workflow_hint: "recruiter.workscore.verify-candidate.v1",
      policy_engine: policyEnabled ? "json-rules-engine" : "disabled",
    },
    weights: WORKSCORE_WEIGHTS,
  });
});

router.get(
  "/workscore/evaluations/:id",
  authMiddleware,
  requireRole("recruiter", "admin", "verifier"),
  async (req, res) => {
    const snapshot = await storage.getWorkScoreEvaluation(req.params.id);

    if (!snapshot) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "WorkScore evaluation snapshot not found",
      });
    }

    return res.json(snapshot);
  },
);

router.get(
  "/workscore/evaluations",
  authMiddleware,
  requireRole("recruiter", "admin", "verifier"),
  async (req, res) => {
    const requested =
      typeof req.query.limit === "string"
        ? Number.parseInt(req.query.limit, 10)
        : 20;
    const evaluations = await storage.getWorkScoreEvaluations(
      Number.isFinite(requested) ? requested : 20,
    );

    return res.json({
      count: evaluations.length,
      evaluations,
    });
  },
);

export default router;
