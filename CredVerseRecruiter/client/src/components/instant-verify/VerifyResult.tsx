import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { VerifyResultHeader } from "./VerifyResultHeader";
import { VerifyRecordDetails } from "./VerifyRecordDetails";
import { VerifyReasonCodes } from "./VerifyReasonCodes";
import { VerifyNextSteps } from "./VerifyNextSteps";
import { VerifyEvidence } from "./VerifyEvidence";
import { VerifyTrustHistory } from "./VerifyTrustHistory";
import { getDecisionTier, decisionCopy } from "./utils";
import { VerificationResult, FraudAnalysis, VerificationRecord, ReasonCode } from "./types";

interface VerifyResultProps {
  verificationResult: VerificationResult;
  fraudAnalysis: FraudAnalysis | null;
  record: VerificationRecord | null;
  onReset: () => void;
}

export function VerifyResult({ verificationResult, fraudAnalysis, record, onReset }: VerifyResultProps) {
  const decision = useMemo(() => {
    const tier = getDecisionTier({
      status: verificationResult?.status,
      recommendation: fraudAnalysis?.recommendation || record?.recommendation,
      riskScore: verificationResult?.riskScore ?? record?.riskScore,
      fraudScore: fraudAnalysis?.score ?? record?.fraudScore,
    });
    return { tier, ...decisionCopy(tier) };
  }, [
    verificationResult?.status,
    verificationResult?.riskScore,
    fraudAnalysis?.recommendation,
    fraudAnalysis?.score,
    record?.recommendation,
    record?.riskScore,
    record?.fraudScore,
  ]);

  const reasonCodes = useMemo(() => {
    const fromRiskFlags = (verificationResult?.riskFlags || []).map((c) => ({
      source: "verifier" as const,
      code: String(c),
    }));
    const fromAiSignals = (fraudAnalysis?.ai?.signals || []).map((s) => ({
      source: "ai" as const,
      code: String(s.code),
      severity: s.severity,
      message: s.message,
    }));
    const fromFraudFlags = (fraudAnalysis?.flags || []).map((f) => {
      if (typeof f === "string") return { source: "fraud" as const, code: f };
      return {
        source: "fraud" as const,
        code: f.type || f.message || "FRAUD_SIGNAL",
        severity: f.severity,
        message: f.description || f.message,
      };
    });

    const merged = [...fromRiskFlags, ...fromAiSignals, ...fromFraudFlags]
      .filter((x) => String(x.code || "").trim().length > 0)
      .map((x) => ({ ...x, code: String(x.code).trim() }));

    // de-dup by code
    const seen = new Set<string>();
    const unique: ReasonCode[] = [];
    for (const item of merged) {
      const key = item.code.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }

    return unique;
  }, [verificationResult?.riskFlags, fraudAnalysis?.ai?.signals, fraudAnalysis?.flags]);

  const evidence = useMemo(() => {
    const checks = verificationResult?.checks || [];
    const find = (name: string) => checks.find((c) => c.name === name);
    return {
      signature: find("Signature Validation"),
      issuer: find("Issuer Verification"),
      anchor: find("Blockchain Anchor"),
      revocation: find("Revocation Check"),
      did: find("DID Resolution"),
    };
  }, [verificationResult?.checks]);

  const toneClasses =
    decision.tone === "emerald"
      ? {
          border: "border-t-emerald-500",
          headerBg: "bg-emerald-50/60 border-emerald-100",
          pill: "bg-emerald-100 text-emerald-700",
          iconWrap: "bg-emerald-100 text-emerald-600",
          title: "text-emerald-950",
        }
      : decision.tone === "amber"
        ? {
            border: "border-t-amber-500",
            headerBg: "bg-amber-50/60 border-amber-100",
            pill: "bg-amber-100 text-amber-700",
            iconWrap: "bg-amber-100 text-amber-600",
            title: "text-amber-950",
          }
        : {
            border: "border-t-red-500",
            headerBg: "bg-red-50/60 border-red-100",
            pill: "bg-red-100 text-red-700",
            iconWrap: "bg-red-100 text-red-600",
            title: "text-red-950",
          };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="h-full">
      <Card className={`h-full border-t-4 shadow-xl overflow-hidden flex flex-col ${toneClasses.border}`}>
        <div className={`p-6 border-b ${toneClasses.headerBg}`}>
          <VerifyResultHeader
            decision={decision}
            toneClasses={toneClasses}
            verificationResult={verificationResult}
            fraudAnalysis={fraudAnalysis}
          />
          <VerifyRecordDetails record={record} />
        </div>

        <CardContent className="p-0 flex-1 bg-background overflow-auto">
          <div className="p-6 space-y-6">
            <VerifyReasonCodes reasonCodes={reasonCodes} />
            <VerifyNextSteps
              decision={decision}
              verificationId={verificationResult.verificationId}
              onReset={onReset}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <VerifyEvidence
                verificationResult={verificationResult}
                fraudAnalysis={fraudAnalysis}
                evidence={evidence}
                recordIssuer={record?.issuer}
              />
              <VerifyTrustHistory record={record} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
