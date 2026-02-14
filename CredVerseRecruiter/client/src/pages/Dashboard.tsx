import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, Users, Activity, RefreshCw, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface VerificationStats {
  total: number;
  today: number;
  verified: number;
  failed: number;
  suspicious: number;
  avgRiskScore: number;
  avgFraudScore: number;
  recommendations: {
    approve: number;
    review: number;
    reject: number;
  };
}

interface VerificationRecord {
  id: string;
  credentialType: string;
  issuer: string;
  subject: string;
  status: string;
  riskScore: number;
  fraudScore: number;
  recommendation: string;
  timestamp: string;
}

const verificationData = [
  { name: "Mon", verified: 145, fraud: 2 },
  { name: "Tue", verified: 230, fraud: 5 },
  { name: "Wed", verified: 180, fraud: 3 },
  { name: "Thu", verified: 290, fraud: 8 },
  { name: "Fri", verified: 350, fraud: 4 },
  { name: "Sat", verified: 120, fraud: 1 },
  { name: "Sun", verified: 90, fraud: 0 },
];

const fraudByType = [
  { name: "Unknown Issuer", value: 45 },
  { name: "Signature Issue", value: 25 },
  { name: "Expired Cert", value: 20 },
  { name: "DID Mismatch", value: 10 },
];

const COLORS = ['#ef4444', '#f97316', '#eab308', '#a855f7'];

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch stats
  const { data: stats, isLoading: statsLoading, isError: statsError, error: statsErrorDetails } = useQuery<{ stats: VerificationStats }>({
    queryKey: ['verification-stats'],
    queryFn: async () => {
      const response = await fetch('/api/verifications/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 10000,
  });

  // Fetch recent verifications
  const { data: recentData, isLoading: recentLoading, isError: recentError, error: recentErrorDetails } = useQuery<{ results: VerificationRecord[] }>({
    queryKey: ['recent-verifications'],
    queryFn: async () => {
      const response = await fetch('/api/verifications?limit=5');
      if (!response.ok) throw new Error('Failed to fetch verifications');
      return response.json();
    },
    refetchInterval: 5000,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['verification-stats'] });
    queryClient.invalidateQueries({ queryKey: ['recent-verifications'] });
    toast({ title: 'Refreshed', description: 'Data updated' });
  };

  const verifiedCount = stats?.stats?.verified || 0;
  const failedCount = stats?.stats?.failed || 0;
  const suspiciousCount = stats?.stats?.suspicious || 0;
  const totalCount = stats?.stats?.total || 0;
  const recentVerifications = recentData?.results || [];

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <DashboardLayout title="Candidate Insights">
      {/* Action Row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-muted-foreground">Real-time verification monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {(statsError || recentError) && (
        <Alert className="mb-6" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Some live data could not be loaded</AlertTitle>
          <AlertDescription>
            {statsError && (statsErrorDetails instanceof Error ? statsErrorDetails.message : "Stats request failed.")}
            {statsError && recentError ? " · " : ""}
            {recentError && (recentErrorDetails instanceof Error ? recentErrorDetails.message : "Recent activity request failed.")}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Total Verified</CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {statsLoading ? '...' : verifiedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
              <span className="text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> Live
              </span>
              <span>auto-updating</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Failed</CardTitle>
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {statsLoading ? '...' : failedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
              <span className="text-destructive font-semibold bg-destructive/10 px-1.5 py-0.5 rounded-full flex items-center">
                <Activity className="h-3 w-3 mr-1" />
                {totalCount > 0 ? Math.round((failedCount / totalCount) * 100) : 0}%
              </span>
              <span>failure rate</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Suspicious</CardTitle>
            <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {statsLoading ? '...' : suspiciousCount}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Requires manual review
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Total Checks</CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {statsLoading ? '...' : totalCount}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All time verifications
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7 mb-8">
        <Card className="md:col-span-4 shadow-sm border-muted/40">
          <CardHeader>
            <CardTitle>Verification Trends</CardTitle>
            <CardDescription>Daily volume of processed credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={verificationData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                  <Area type="monotone" dataKey="verified" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorVerified)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 shadow-sm border-muted/40">
          <CardHeader>
            <CardTitle>Fraud Risk Analysis</CardTitle>
            <CardDescription>Common rejection reasons</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={fraudByType} margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.2)' }} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24} animationDuration={1500}>
                    {fraudByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-muted/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Live verification feed</CardDescription>
          </div>
          {recentLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentVerifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No verifications yet. Run an instant or link verification to create activity.</p>
              </div>
            ) : (
              recentVerifications.map((record) => (
                <div key={record.id} className="group flex items-center justify-between border-b border-border/50 last:border-0 py-4 hover:bg-muted/30 px-2 rounded-lg transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shadow-sm ${record.status === 'verified'
                        ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-200'
                        : record.status === 'suspicious'
                          ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-200'
                          : 'bg-destructive/10 text-destructive ring-2 ring-destructive/20'
                      }`}>
                      {record.status === 'verified' ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : record.status === 'suspicious' ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold group-hover:text-primary transition-colors">{record.credentialType}</p>
                      <p className="text-xs text-muted-foreground">{record.issuer} • {record.subject}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <Badge variant={
                      record.recommendation === 'approve' ? 'outline' :
                        record.recommendation === 'review' ? 'secondary' :
                          'destructive'
                    } className="text-xs">
                      {record.recommendation}
                    </Badge>
                    <div>
                      <p className={`text-sm font-medium ${record.status === 'verified' ? 'text-emerald-600' :
                          record.status === 'suspicious' ? 'text-amber-600' :
                            'text-destructive'
                        }`}>{record.status}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(record.timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
