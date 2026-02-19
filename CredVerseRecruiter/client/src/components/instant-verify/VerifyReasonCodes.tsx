import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { ReasonCode } from "./types";
import { normalizeReasonCode } from "./utils";

interface VerifyReasonCodesProps {
  reasonCodes: ReasonCode[];
}

export function VerifyReasonCodes({ reasonCodes }: VerifyReasonCodesProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Top reasons</p>
        {reasonCodes.length > 0 && <p className="text-xs text-muted-foreground font-mono">{reasonCodes.length} codes</p>}
      </div>

      {reasonCodes.length === 0 ? (
        <div className="text-sm text-muted-foreground border rounded-lg p-3 bg-muted/20">No reason codes returned.</div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-2">
            {reasonCodes.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-start justify-between gap-3 rounded-lg border bg-muted/10 p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={r.source === "ai" ? "outline" : "secondary"} className="text-xs font-mono">
                      {normalizeReasonCode(r.code)}
                    </Badge>
                    {r.severity ? (
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{String(r.severity)}</span>
                    ) : null}
                  </div>
                  {r.message ? <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.message}</p> : null}
                </div>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{r.source}</span>
              </div>
            ))}
          </div>

          <Collapsible>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">All codes</p>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8">
                  View <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-2">
              <div className="flex flex-wrap gap-2">
                {reasonCodes.map((r, i) => (
                  <Badge key={i} variant={r.source === "ai" ? "outline" : "secondary"} className="text-xs font-mono">
                    {normalizeReasonCode(r.code)}
                  </Badge>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
