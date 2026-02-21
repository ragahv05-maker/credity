import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { STATS, RECENT_ACTIVITY } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  MoreHorizontal,
  FileCheck,
  Download,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const { data: analytics } = useQuery<any>({
    queryKey: ["/api/v1/analytics"],
  });

  const stats = analytics?.stats || STATS;
  const chartData = analytics?.chartData || [
    { month: "Jan", issued: 186 },
    { month: "Feb", issued: 305 },
    { month: "Mar", issued: 237 },
    { month: "Apr", issued: 73 },
    { month: "May", issued: 209 },
    { month: "Jun", issued: 214 },
  ];

  // Export dashboard report
  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/v1/reports/dashboard", {
        headers: { "x-api-key": (import.meta as any).env?.VITE_API_KEY || "" },
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dashboard-report-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Report exported",
        description: "Dashboard report has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not generate the report.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight">
              Dashboard
            </h2>
            <p className="text-muted-foreground mt-1">
              Welcome back, Admin. Here's what's happening today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex"
              onClick={handleExportReport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export Report
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 shadow-md"
              onClick={() => navigate("/issuance")}
            >
              <FileCheck className="mr-2 h-4 w-4" />
              Issue Credentials
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat: any, index: number) => {
            // Map label to icon/color (since backend only sends values)
            const defaultStat =
              STATS.find((s) => s.label === stat.label) || STATS[0];
            const Icon = defaultStat.icon;
            const color = defaultStat.color;
            const bg = defaultStat.bg;

            return (
              <Card
                key={index}
                className="shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <div className={cn("p-2 rounded-full", bg)}>
                    <Icon className={cn("h-4 w-4", color)} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-heading">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.change}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Chart */}
          <Card className="col-span-4 shadow-sm">
            <CardHeader>
              <CardTitle>Issuance Trends</CardTitle>
              <CardDescription>
                Monthly credential issuance volume for 2025
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorIssued"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius-md)",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="issued"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorIssued)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="col-span-3 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => navigate("/verification-logs")}
              >
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {RECENT_ACTIVITY.map((activity) => (
                  <div key={activity.id} className="flex items-center">
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">
                        {activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.details}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">
                        {activity.time}
                      </div>
                      <Badge
                        variant={
                          activity.status === "completed"
                            ? "default"
                            : activity.status === "processing"
                              ? "secondary"
                              : "outline"
                        }
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 h-auto font-normal capitalize",
                          activity.status === "completed" &&
                            "bg-green-100 text-green-700 hover:bg-green-100 border-green-200 shadow-none",
                          activity.status === "processing" &&
                            "bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200",
                          activity.status === "pending" &&
                            "bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200",
                        )}
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
