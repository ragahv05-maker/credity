import { Router } from "express";
import { z } from "zod";
import {
  SAFEDATE_REASON_CODES,
  SAFEDATE_WEIGHTS,
} from "@credverse/shared-auth";
import { evaluateSafeDate } from "../services/safedate";

const router = Router();

const safeDateFactorSchema = z.number().min(0).max(1);

const safeDatePayloadSchema = z
  .object({
    factors: z
      .object({
        profile_integrity: safeDateFactorSchema.optional(),
        identity_confidence: safeDateFactorSchema.optional(),
        social_consistency: safeDateFactorSchema.optional(),
        behavior_stability: safeDateFactorSchema.optional(),
        risk_checks: safeDateFactorSchema.optional(),
      })
      .strict()
      .optional(),
    reason_codes: z.array(z.enum(SAFEDATE_REASON_CODES)).optional(),
    evidence: z
      .object({
        summary: z.string().optional(),
        signals_checked: z.array(z.string()).optional(),
        checks_run: z.array(z.string()).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

router.post("/safedate/evaluate", (req, res) => {
  const parsed = safeDatePayloadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Invalid SafeDate request payload",
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const evaluation = evaluateSafeDate({
    factors: parsed.data.factors,
    reason_codes: parsed.data.reason_codes,
    evidence: parsed.data.evidence,
  });

  return res.json({
    score: evaluation.score,
    factors: evaluation.factors,
    decision: evaluation.decision,
    reason_codes: evaluation.reason_codes,
    evidence: evaluation.evidence,
    weights: SAFEDATE_WEIGHTS,
  });
});

export default router;
