import { Button } from "@/components/ui/button";
import { Clipboard, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DecisionTier } from "./types";

interface VerifyNextStepsProps {
  decision: { tier: DecisionTier };
  verificationId: string;
  onReset: () => void;
}

export function VerifyNextSteps({ decision, verificationId, onReset }: VerifyNextStepsProps) {
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: text.slice(0, 80) + (text.length > 80 ? "…" : "") });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase">What to do next</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {decision.tier === "PASS" && (
          <>
            <div className="border rounded-lg p-3 bg-emerald-50/40">
              <p className="text-sm font-medium">Proceed</p>
              <p className="text-xs text-muted-foreground mt-1">Move candidate forward to the next stage and store report.</p>
            </div>
            <div className="border rounded-lg p-3 bg-muted/20">
              <p className="text-sm font-medium">Archive evidence</p>
              <p className="text-xs text-muted-foreground mt-1">Export report and attach to the candidate profile.</p>
            </div>
          </>
        )}
        {decision.tier === "REVIEW" && (
          <>
            <div className="border rounded-lg p-3 bg-amber-50/40">
              <p className="text-sm font-medium">Request supporting docs</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ask for transcripts, offer letters, or issuer contact verification.
              </p>
            </div>
            <div className="border rounded-lg p-3 bg-muted/20">
              <p className="text-sm font-medium">Re-verify later</p>
              <p className="text-xs text-muted-foreground mt-1">If anchor is pending, re-run after some time.</p>
            </div>
          </>
        )}
        {decision.tier === "FAIL" && (
          <>
            <div className="border rounded-lg p-3 bg-red-50/40">
              <p className="text-sm font-medium">Escalate</p>
              <p className="text-xs text-muted-foreground mt-1">
                Flag for compliance review and do not proceed until resolved.
              </p>
            </div>
            <div className="border rounded-lg p-3 bg-muted/20">
              <p className="text-sm font-medium">Collect fresh credential</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ask candidate to re-issue from a verified issuer (new proof + anchor).
              </p>
            </div>
          </>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => copyToClipboard(verificationId)}>
          <Clipboard className="w-4 h-4 mr-2" /> Copy verification ID
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast({ title: "Coming soon", description: "Report export is a UI stub in this sprint." })}
        >
          <Download className="w-4 h-4 mr-2" /> Export report
        </Button>
        <Button size="sm" onClick={onReset}>
          Verify another
        </Button>
      </div>
    </div>
  );
}
