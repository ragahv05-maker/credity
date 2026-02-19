import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertOctagon, AlertTriangle, Eye, Clipboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VerificationResult, FraudAnalysis, Evidence } from "./types";
import { normalizeReasonCode } from "./utils";

interface VerifyEvidenceProps {
  verificationResult: VerificationResult;
  fraudAnalysis: FraudAnalysis | null;
  evidence: Evidence;
  recordIssuer: string | undefined;
}

export function VerifyEvidence({ verificationResult, fraudAnalysis, evidence, recordIssuer }: VerifyEvidenceProps) {
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: text.slice(0, 80) + (text.length > 80 ? "…" : "") });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const getCheckIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "failed":
        return <AlertOctagon className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Eye className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Evidence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Verifier checks</p>
          {(verificationResult.checks || []).length === 0 ? (
            <div className="text-sm text-muted-foreground border rounded-lg p-3">No check details were returned by the verifier.</div>
          ) : (
            <div className="space-y-2">
              {verificationResult.checks.map((check, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border">
                  <div className="mt-0.5">{getCheckIcon(check.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-sm truncate">{check.name}</p>
                      <Badge
                        variant={
                          check.status === "passed"
                            ? "outline"
                            : check.status === "warning"
                              ? "secondary"
                              : check.status === "skipped"
                                ? "secondary"
                                : "destructive"
                        }
                        className="text-xs"
                      >
                        {check.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Proof / Anchor metadata</p>
          <div className="grid gap-2">
            <div className="border rounded-lg p-3 bg-muted/10">
              <p className="text-sm font-medium">Signature</p>
              <p className="text-xs text-muted-foreground mt-1">
                Proof type: {String(evidence.signature?.details?.proofType ?? "unknown")}
              </p>
              {typeof evidence.signature?.details?.issuer === "string" && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    Issuer: {String(evidence.signature.details.issuer)}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(String(evidence.signature?.details?.issuer))}>
                    <Clipboard className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-3 bg-muted/10">
              <p className="text-sm font-medium">Issuer Trust</p>
              <p className="text-xs text-muted-foreground mt-1">
                {evidence.issuer?.details?.trusted === true
                  ? `Trusted issuer: ${String(evidence.issuer?.details?.issuerName ?? recordIssuer ?? "")}`
                  : `Issuer not fully verified: ${String(evidence.issuer?.details?.issuerName ?? recordIssuer ?? "")}`}
              </p>
              {typeof evidence.issuer?.details?.did === "string" && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-mono text-muted-foreground truncate">DID: {String(evidence.issuer.details.did)}</p>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(String(evidence.issuer?.details?.did))}>
                    <Clipboard className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-3 bg-muted/10">
              <p className="text-sm font-medium">Blockchain Anchor</p>
              <p className="text-xs text-muted-foreground mt-1">{String(evidence.anchor?.message ?? "Not provided")}</p>
              {typeof evidence.anchor?.details?.hash === "string" && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-mono text-muted-foreground truncate">Hash: {String(evidence.anchor.details.hash)}</p>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(String(evidence.anchor?.details?.hash))}>
                    <Clipboard className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {typeof evidence.anchor?.details?.issuer === "string" && (
                <p className="text-xs font-mono text-muted-foreground mt-1 truncate">
                  Issuer (on-chain): {String(evidence.anchor.details.issuer)}
                </p>
              )}
              {typeof evidence.anchor?.details?.timestamp === "number" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Anchored at: {new Date(Number(evidence.anchor.details.timestamp) * 1000).toLocaleString()}
                </p>
              )}
              {typeof evidence.anchor?.details?.compatibilityMode === "string" && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Mode: {String(evidence.anchor.details.compatibilityMode)}
                </p>
              )}
            </div>
          </div>
        </div>

        {fraudAnalysis?.ai && (
          <div className="border rounded-lg p-3 bg-blue-50/70 border-blue-100">
            <p className="text-sm font-medium text-blue-900">AI Copilot ({fraudAnalysis.ai.provider})</p>
            <p className="text-xs text-blue-800 mt-1">Confidence: {Math.round((fraudAnalysis.ai.confidence ?? 0) * 100)}%</p>
            <p className="text-sm text-blue-900 mt-2">{fraudAnalysis.ai.summary}</p>
            {fraudAnalysis.ai.signals?.length > 0 && (
              <div className="mt-3 space-y-2">
                {fraudAnalysis.ai.signals.slice(0, 5).map((s, i) => (
                  <div key={i} className="text-xs text-blue-900 flex items-start gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {normalizeReasonCode(s.code)}
                    </Badge>
                    <span className="text-blue-800">{s.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
