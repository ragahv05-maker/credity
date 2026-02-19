import { DecisionTier } from "./types";

export function normalizeReasonCode(code: string) {
  return String(code || "")
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function getDecisionTier(args: { status?: string; recommendation?: string; riskScore?: number; fraudScore?: number }): DecisionTier {
  const rec = String(args.recommendation || "").toLowerCase();
  if (rec === "reject") return "FAIL";
  if (rec === "review") return "REVIEW";
  if (rec === "approve" || rec === "accept") return "PASS";

  const status = String(args.status || "").toLowerCase();
  if (status === "failed") return "FAIL";
  if (status === "suspicious" || status === "pending") return "REVIEW";
  if (status === "verified") return "PASS";

  const risk = Number(args.riskScore ?? 0);
  const fraud = Number(args.fraudScore ?? 0);
  if (risk >= 60 || fraud >= 60) return "FAIL";
  if (risk >= 30 || fraud >= 30) return "REVIEW";
  return "PASS";
}

export function decisionCopy(tier: DecisionTier) {
  switch (tier) {
    case "PASS":
      return {
        title: "Pass",
        subtitle: "Credential looks authentic.",
        tone: "emerald" as const,
      };
    case "REVIEW":
      return {
        title: "Review",
        subtitle: "Risk signals detected. Verify before proceeding.",
        tone: "amber" as const,
      };
    case "FAIL":
      return {
        title: "Fail",
        subtitle: "High fraud risk or invalid credential.",
        tone: "red" as const,
      };
  }
}

export async function readApiError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data?.error || data?.message || fallback;
  } catch {
    const text = await response.text();
    return text || fallback;
  }
}
