import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, Loader2, AlertTriangle, CheckCircle2, Clock3, XCircle, FileText, ShieldCheck } from "lucide-react";

interface ClaimsStats {
  total: number;
  approved: number;
  review: number;
  investigate: number;
  rejected: number;
  avgTrustScore: number;
}

interface ClaimSummary {
  id: string;
  trust_score: number;
  recommendation: "approve" | "review" | "investigate" | "reject" | string;
  claim_type: string;
  created_at: string;
}

interface ClaimsResponse {
  claims?: ClaimSummary[];
  stats?: ClaimsStats;
}

const emptyStats: ClaimsStats = {
  total: 0,
  approved: 0,
  review: 0,
  investigate: 0,
  rejected: 0,
  avgTrustScore: 0,
};

export default function ClaimsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today");

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<ClaimsResponse>({
    queryKey: ["claims-dashboard", selectedPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/claims?period=${selectedPeriod}&limit=100`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Claims API unavailable (${res.status})`);
      }
      return res.json();
    },
    refetchInterval: 30000,
  });

  const claims = data?.claims ?? [];
  const stats = data?.stats ?? emptyStats;

  const approvedPercent = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
  const reviewPercent = stats.total > 0 ? Math.round((stats.review / stats.total) * 100) : 0;
  const investigatePercent = stats.total > 0 ? Math.round((stats.investigate / stats.total) * 100) : 0;
  const rejectedPercent = stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0;

  const amountSaved = useMemo(() => (stats.rejected + stats.investigate) * 15000, [stats]);

  return (
    <DashboardLayout title="Claims Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-muted-foreground">Claims analytics and adjudication overview</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border bg-background p-1">
              {(["today", "week", "month"] as const).map((period) => (
                <Button
                  key={period}
                  size="sm"
                  variant={period === selectedPeriod ? "default" : "ghost"}
                  onClick={() => setSelectedPeriod(period)}
                  className="capitalize"
                >
                  {period}
                </Button>
              ))}
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {isError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Claims feed unavailable</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to load claims data."}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Claims Processed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{isLoading ? "…" : stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Auto Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{isLoading ? "…" : stats.approved}</p>
              <p className="text-xs text-muted-foreground">{approvedPercent}% of total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Fraud / Risk Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{isLoading ? "…" : stats.rejected + stats.investigate}</p>
              <p className="text-xs text-muted-foreground">Review + reject volume</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Estimated Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">₹{(amountSaved / 100000).toFixed(1)}L</p>
              <p className="text-xs text-muted-foreground">Based on prevented fraud loss</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recommendation Breakdown</CardTitle>
              <CardDescription>Distribution across automated outcomes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1"><span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Approve</span><span>{stats.approved}</span></div>
                <Progress value={approvedPercent} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-blue-500" />Review</span><span>{stats.review}</span></div>
                <Progress value={reviewPercent} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Investigate</span><span>{stats.investigate}</span></div>
                <Progress value={investigatePercent} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span className="flex items-center gap-2"><XCircle className="w-4 h-4 text-destructive" />Rejected</span><span>{stats.rejected}</span></div>
                <Progress value={rejectedPercent} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trust & Throughput</CardTitle>
              <CardDescription>Current quality indicators</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <ShieldCheck className="w-4 h-4 text-primary mb-1" />
                <p className="text-xl font-semibold">{stats.avgTrustScore || 0}</p>
                <p className="text-xs text-muted-foreground">Average Trust Score</p>
              </div>
              <div className="rounded-lg border p-3">
                <FileText className="w-4 h-4 text-primary mb-1" />
                <p className="text-xl font-semibold">{claims.length}</p>
                <p className="text-xs text-muted-foreground">Claims in feed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Claims</CardTitle>
              <CardDescription>Latest adjudication activity</CardDescription>
            </div>
            {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading claims…</div>
            ) : claims.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No claims yet for this period.</p>
                <p className="text-xs mt-1">Once claims are processed, evidence and recommendations will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {claims.slice(0, 8).map((claim) => (
                  <div key={claim.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{claim.id}</p>
                      <p className="text-xs text-muted-foreground capitalize">{claim.claim_type?.replaceAll("_", " ") || "claim"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={claim.recommendation === "approve" ? "outline" : claim.recommendation === "review" ? "secondary" : "destructive"}>
                        {claim.recommendation}
                      </Badge>
                      <div className="text-right">
                        <p className="font-semibold">{claim.trust_score ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Trust</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
