import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck,
  AlertTriangle,
  Globe,
  Download,
  Clock,
  MapPin,
  Loader2,
  FileCheck,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface VerificationLog {
  id: string;
  credentialId: string;
  verifierName: string;
  verifierLocation: string;
  timestamp: string;
  status: "success" | "failed" | "suspicious";
  ipAddress: string;
}

interface VerificationStats {
  total: number;
  today: number;
  suspicious: number;
}

export default function VerificationLogs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch verification logs
  const { data: logs = [], isLoading } = useQuery<VerificationLog[]>({
    queryKey: ["verification-logs"],
    queryFn: async () => {
      const response = await fetch("/api/v1/verification-logs", {
        headers: { "x-api-key": (import.meta as any).env?.VITE_API_KEY || "" },
      });
      if (!response.ok) throw new Error("Failed to fetch logs");
      return response.json();
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds for real-time feel
  });

  // Fetch stats
  const { data: stats } = useQuery<VerificationStats>({
    queryKey: ["verification-stats"],
    queryFn: async () => {
      const response = await fetch("/api/v1/verification-logs/stats", {
        headers: { "x-api-key": (import.meta as any).env?.VITE_API_KEY || "" },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    refetchInterval: 5000,
  });

  // Export logs
  const handleExport = async () => {
    const response = await fetch("/api/v1/exports/verification-logs/csv", {
      headers: { "x-api-key": (import.meta as any).env?.VITE_API_KEY || "" },
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "verification-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Export complete",
      description: "Verification logs exported to CSV.",
    });
  };

  // Refresh data
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["verification-logs"] });
    queryClient.invalidateQueries({ queryKey: ["verification-stats"] });
    toast({ title: "Refreshed", description: "Data has been updated." });
  };

  // Format relative time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">
              Verification Logs
            </h2>
            <p className="text-muted-foreground mt-1">
              Monitor real-time credential verifications worldwide.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Verifications
              </CardTitle>
              <FileCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total ?? "—"}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Checks
              </CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.today ?? "—"}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Suspicious Activity
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {stats?.suspicious ?? "0"}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Success Rate
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {stats?.total
                  ? Math.round(
                      ((stats.total - stats.suspicious) / stats.total) * 100,
                    )
                  : 100}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                Verified successfully
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Live Feed Indicator */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  Live Verification Feed
                </CardTitle>
                <CardDescription>
                  Real-time verification events from employers and institutions
                  worldwide
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-green-600">
                Auto-updating
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No verification events yet</p>
                <p className="text-sm">
                  Logs will appear here when credentials are verified
                </p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Credential ID</TableHead>
                      <TableHead>Verifier</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow
                        key={log.id}
                        className={
                          log.status === "suspicious" ? "bg-amber-50/50" : ""
                        }
                      >
                        <TableCell>
                          {log.status === "success" ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          ) : log.status === "suspicious" ? (
                            <Badge
                              variant="destructive"
                              className="bg-amber-100 text-amber-700 border-amber-200"
                            >
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Suspicious
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.credentialId}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{log.verifierName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {log.verifierLocation}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTime(log.timestamp)}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {log.ipAddress}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
