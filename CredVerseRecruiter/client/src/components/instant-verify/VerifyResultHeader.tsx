import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, AlertOctagon } from "lucide-react";
import { motion } from "framer-motion";
import { ToneClasses, DecisionTier, VerificationResult, FraudAnalysis } from "./types";

interface VerifyResultHeaderProps {
  decision: {
    tier: DecisionTier;
    title: string;
    subtitle: string;
    tone: "emerald" | "amber" | "red";
  };
  toneClasses: ToneClasses;
  verificationResult: VerificationResult;
  fraudAnalysis: FraudAnalysis | null;
}

export function VerifyResultHeader({ decision, toneClasses, verificationResult, fraudAnalysis }: VerifyResultHeaderProps) {
  const statusIcon =
    decision.tier === "PASS" ? (
      <CheckCircle className="w-8 h-8" />
    ) : decision.tier === "REVIEW" ? (
      <AlertTriangle className="w-8 h-8" />
    ) : (
      <AlertOctagon className="w-8 h-8" />
    );

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-4">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm ${toneClasses.iconWrap}`}
        >
          {statusIcon}
        </motion.div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`text-2xl font-bold tracking-tight ${toneClasses.title}`}>{decision.title}</h2>
            <Badge className={`${toneClasses.pill} border-0`}>{decision.tier}</Badge>
            <span className="text-xs text-muted-foreground font-mono truncate">ID: {verificationResult.verificationId}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{decision.subtitle}</p>
        </div>
      </div>

      <div className="w-full md:w-[320px] rounded-xl border bg-background/60 p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Confidence</p>
          <p className="text-sm font-semibold">{Math.round(Number(verificationResult.confidence ?? 0))}%</p>
        </div>
        <Progress value={Math.round(Number(verificationResult.confidence ?? 0))} className="h-2 mt-2" />

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge
            variant={
              Number(verificationResult.riskScore ?? 0) >= 50
                ? "destructive"
                : Number(verificationResult.riskScore ?? 0) >= 30
                  ? "secondary"
                  : "outline"
            }
          >
            Risk {Number(verificationResult.riskScore ?? 0)}
          </Badge>
          {typeof fraudAnalysis?.score === "number" && (
            <Badge variant={fraudAnalysis.score >= 60 ? "destructive" : fraudAnalysis.score >= 30 ? "secondary" : "outline"}>
              Fraud {Math.round(fraudAnalysis.score)}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
