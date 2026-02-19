import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VerificationRecord } from "./types";
import { readApiError } from "./utils";

interface VerifyTrustHistoryProps {
  record: VerificationRecord | null;
}

export function VerifyTrustHistory({ record }: VerifyTrustHistoryProps) {
  const { toast } = useToast();
  const [trustHistory, setTrustHistory] = useState<VerificationRecord[] | null>(null);
  const [trustHistoryError, setTrustHistoryError] = useState<string | null>(null);
  const [trustHistoryLoading, setTrustHistoryLoading] = useState(false);

  useEffect(() => {
    const subject = record?.subject;
    const issuer = record?.issuer;
    const credentialType = record?.credentialType;
    const currentId = record?.id;

    if (!subject || !issuer || !credentialType) return;

    let cancelled = false;
    setTrustHistoryLoading(true);
    setTrustHistoryError(null);

    (async () => {
      try {
        const res = await fetch(`/api/analytics/verifications?limit=50`);
        if (!res.ok) throw new Error(await readApiError(res, "Failed to load trust history"));
        const data = await res.json();
        const rows: VerificationRecord[] = Array.isArray(data?.results) ? data.results : [];

        const filtered = rows
          .filter((r) => r && r.id !== currentId)
          .filter((r) => String(r.subject) === String(subject))
          .filter((r) => String(r.issuer) === String(issuer))
          .filter((r) => String(r.credentialType) === String(credentialType))
          .slice(0, 6);

        if (!cancelled) setTrustHistory(filtered);
      } catch (e) {
        if (!cancelled) setTrustHistoryError(e instanceof Error ? e.message : "Failed to load trust history");
      } finally {
        if (!cancelled) setTrustHistoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [record?.subject, record?.issuer, record?.credentialType, record?.id]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4" /> Trust History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Past verifications for the same subject + issuer + credential type (if available).
        </p>

        {trustHistoryLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
          </div>
        )}

        {trustHistoryError && (
          <div className="text-sm text-red-700 border border-red-200 rounded-lg p-3 bg-red-50">{trustHistoryError}</div>
        )}

        {!trustHistoryLoading && !trustHistoryError && (trustHistory?.length ?? 0) === 0 && (
          <div className="text-sm text-muted-foreground border rounded-lg p-3 bg-muted/10">No prior matches found.</div>
        )}

        {!trustHistoryLoading && !trustHistoryError && (trustHistory?.length ?? 0) > 0 && (
          <div className="space-y-2">
            {(trustHistory || []).map((h) => (
              <div key={h.id} className="border rounded-lg p-3 bg-muted/10">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-mono text-muted-foreground truncate">{h.id}</p>
                  <Badge
                    variant={
                      String(h.status) === "verified"
                        ? "outline"
                        : String(h.status) === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {String(h.status).toUpperCase()}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Risk {h.riskScore} · Fraud {h.fraudScore}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toast({
                        title: "Tip",
                        description: "History links can be wired to a details page using /api/analytics/verifications/:id.",
                      })
                    }
                  >
                    View <ExternalLink className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
