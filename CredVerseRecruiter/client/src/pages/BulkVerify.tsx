import { useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { useMutation } from "@tanstack/react-query";

interface VerificationResult {
  id: string;
  name: string;
  issuer: string;
  status: "verified" | "failed" | "suspicious" | "pending";
  riskScore: number;
  details?: any;
}

function safeJsonParse(value?: string) {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export default function BulkVerify() {
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const verifyMutation = useMutation({
    mutationFn: async (credentials: any[]) => {
      const res = await fetch("/api/verify/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Bulk verification failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const rawResults = data?.result?.results ?? [];
      const mapped: VerificationResult[] = rawResults.map((r: any, index: number) => ({
        id: r?.verificationId || `BULK-${index + 1}`,
        name:
          r?.checks?.find((c: any) => c?.name === "Credential Format")?.details?.name ||
          r?.credentialSubject?.name ||
          "Unknown Candidate",
        issuer:
          r?.checks?.find((c: any) => c?.name === "Issuer Verification")?.details?.issuerName ||
          r?.issuer ||
          "Unknown Issuer",
        status: r?.status || "pending",
        riskScore: Number(r?.riskScore ?? 0),
        details: r,
      }));
      setResults(mapped);
      setIsProcessing(false);
      toast({
        title: "Verification complete",
        description: `Processed ${data?.result?.total ?? mapped.length} credential(s).`,
      });
    },
    onError: (error) => {
      setIsProcessing(false);
      toast({
        title: "Bulk verification failed",
        description: error instanceof Error ? error.message : "Failed to process batch.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    Papa.parse(file, {
      header: true,
      complete: (parsed) => {
        const rows = (parsed.data as any[]).filter((row) => Object.values(row || {}).some((v) => String(v || "").trim().length > 0));
        const credentials = rows
          .map((row, index) => {
            if (row.jwt) return { jwt: String(row.jwt).trim() };

            return {
              credential: {
                type: ["VerifiableCredential", row.Type || row.type || "AcademicCredential"],
                issuer: row.Issuer || row.issuer || "Unknown",
                credentialSubject: {
                  name: row.Name || row.name || "Candidate",
                  degree: row.Degree || row.degree || "Qualification",
                  id: `did:key:bulk${index}`,
                },
                proof: safeJsonParse(row.proof),
              },
            };
          })
          .filter((c) => c.jwt || c.credential);

        if (credentials.length === 0) {
          setIsProcessing(false);
          toast({ title: "Empty or invalid CSV", variant: "destructive" });
          return;
        }

        verifyMutation.mutate(credentials);
      },
      error: (error) => {
        setIsProcessing(false);
        toast({ title: "CSV parsing error", description: error.message, variant: "destructive" });
      },
    });
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Issuer,Degree,Type\nJohn Doe,Demo University,B.S. Computer Science,AcademicCredential";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "verification_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportResults = () => {
    if (results.length === 0) return;
    const header = "ID,Candidate,Issuer,Status,RiskScore\n";
    const rows = results
      .map((r) => `${r.id},${JSON.stringify(r.name)},${JSON.stringify(r.issuer)},${r.status},${r.riskScore}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk-verification-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = useMemo(() => {
    return {
      verified: results.filter((r) => r.status === "verified").length,
      failed: results.filter((r) => r.status === "failed").length,
      suspicious: results.filter((r) => r.status === "suspicious").length,
    };
  }, [results]);

  return (
    <DashboardLayout title="Bulk Verification">
      <div className="space-y-6">
        <Card className="border-2 border-dashed border-muted-foreground/20 bg-muted/5">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Upload Credential CSV</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-2 mb-6">
              Supported columns: jwt OR Name, Issuer, Degree, Type, proof. Up to 100 rows per batch.
            </p>
            <div className="flex gap-4">
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                {isProcessing ? "Processing..." : "Select CSV File"}
              </Button>
              <Button variant="outline" onClick={downloadTemplate}>Download Template</Button>
            </div>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Verification Results</CardTitle>
                <CardDescription>
                  {results.length} processed • {summary.verified} verified • {summary.suspicious} suspicious • {summary.failed} failed
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportResults}>
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Issuer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Risk Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{row.id}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.issuer}</TableCell>
                      <TableCell>
                        {row.status === "verified" && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Verified</Badge>}
                        {row.status === "failed" && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>}
                        {row.status === "suspicious" && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><AlertCircle className="w-3 h-3 mr-1" /> Suspicious</Badge>}
                        {row.status === "pending" && <Badge variant="secondary">Pending</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{row.riskScore}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
