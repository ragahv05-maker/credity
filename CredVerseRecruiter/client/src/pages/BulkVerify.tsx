import { useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, AlertCircle, Loader2, ShieldAlert, Clipboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { useMutation } from "@tanstack/react-query";

interface VerificationCheck {
  name: string;
  status: "passed" | "failed" | "warning" | "skipped";
  message: string;
  details?: Record<string, unknown>;
}

interface BulkVerificationResultRow {
  id: string;
  name: string;
  issuer: string;
  status: "verified" | "failed" | "suspicious" | "pending";
  riskScore: number;
  confidence?: number;
  riskFlags?: string[];
  checks?: VerificationCheck[];
  details?: Record<string, unknown>;
}

type DecisionTier = "PASS" | "REVIEW" | "FAIL";

function getDecisionTierFromStatus(status: BulkVerificationResultRow["status"], riskScore: number): DecisionTier {
  if (status === "failed") return "FAIL";
  if (status === "suspicious" || status === "pending") return "REVIEW";
  // verified
  if (riskScore >= 40) return "REVIEW";
  return "PASS";
}

function normalizeReasonCode(code: string) {
  return String(code || "")
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .toUpperCase();
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
  const [results, setResults] = useState<BulkVerificationResultRow[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<BulkVerificationResultRow | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const verifyMutation = useMutation({
    mutationFn: async (credentials: unknown[]) => {
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
      const rawResults: unknown[] = Array.isArray(data?.result?.results) ? data.result.results : [];

      const mapped: BulkVerificationResultRow[] = rawResults.map((item, index: number) => {
        // The bulk verifier returns VerificationResult objects (server-side). Keep runtime-safe access.
        const r = item as Record<string, unknown>;
        const checks = (r.checks as unknown[]) || [];

        const findCheckDetails = (checkName: string): Record<string, unknown> | undefined => {
          const found = (Array.isArray(checks) ? checks : []).find((c) => {
            if (!c || typeof c !== "object") return false;
            return (c as Record<string, unknown>).name === checkName;
          });
          if (!found || typeof found !== "object") return undefined;
          const details = (found as Record<string, unknown>).details;
          if (!details || typeof details !== "object") return undefined;
          return details as Record<string, unknown>;
        };

        const credentialSubject = r.credentialSubject as Record<string, unknown> | undefined;

        return {
          id: (r.verificationId as string) || `BULK-${index + 1}`,
          name: (findCheckDetails("Credential Format")?.name as string) || (credentialSubject?.name as string) || "Unknown Candidate",
          issuer: (findCheckDetails("Issuer Verification")?.issuerName as string) || (r.issuer as string) || "Unknown Issuer",
          status: (r.status as BulkVerificationResultRow["status"]) || "pending",
          riskScore: Number((r.riskScore as number) ?? 0),
          confidence: typeof r.confidence === "number" ? (r.confidence as number) : undefined,
          riskFlags: Array.isArray(r.riskFlags) ? (r.riskFlags as string[]) : [],
          checks: Array.isArray(r.checks) ? (r.checks as VerificationCheck[]) : [],
          details: r,
        };
      });

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
    setResults([]);

    Papa.parse(file, {
      header: true,
      complete: (parsed) => {
        const raw = Array.isArray(parsed.data) ? (parsed.data as unknown[]) : [];
        const rows = raw
          .filter((row) => row && typeof row === "object")
          .map((row) => row as Record<string, unknown>)
          .filter((row) => Object.values(row || {}).some((v) => String(v || "").trim().length > 0));
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
                proof: safeJsonParse(typeof row.proof === "string" ? row.proof : undefined),
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
    const header = "ID,Candidate,Issuer,Decision,Status,Confidence,RiskScore,ReasonCodes\n";
    const rows = results
      .map((r) => {
        const decision = getDecisionTierFromStatus(r.status, r.riskScore);
        const reasonCodes = (r.riskFlags || []).slice(0, 10).map(normalizeReasonCode).join(" |");
        return `${r.id},${JSON.stringify(r.name)},${JSON.stringify(r.issuer)},${decision},${r.status},${typeof r.confidence === "number" ? r.confidence : ""},${r.riskScore},${JSON.stringify(reasonCodes)}`;
      })
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
      suspicious: results.filter((r) => r.status === "suspicious" || r.status === "pending").length,
      pass: results.filter((r) => getDecisionTierFromStatus(r.status, r.riskScore) === "PASS").length,
      review: results.filter((r) => getDecisionTierFromStatus(r.status, r.riskScore) === "REVIEW").length,
      fail: results.filter((r) => getDecisionTierFromStatus(r.status, r.riskScore) === "FAIL").length,
    };
  }, [results]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: text });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const renderStatusBadge = (row: BulkVerificationResultRow) => {
    if (row.status === "verified")
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
        </Badge>
      );
    if (row.status === "failed")
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="w-3 h-3 mr-1" /> Failed
        </Badge>
      );
    if (row.status === "suspicious")
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <AlertCircle className="w-3 h-3 mr-1" /> Suspicious
        </Badge>
      );
    return <Badge variant="secondary">Pending</Badge>;
  };

  const renderDecisionBadge = (row: BulkVerificationResultRow) => {
    const decision = getDecisionTierFromStatus(row.status, row.riskScore);
    if (decision === "PASS") return <Badge className="bg-emerald-100 text-emerald-700 border-0">PASS</Badge>;
    if (decision === "FAIL") return <Badge className="bg-red-100 text-red-700 border-0">FAIL</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 border-0">REVIEW</Badge>;
  };

  const findEvidence = (checks: VerificationCheck[] | undefined, name: string) => (checks || []).find((c) => c.name === name);

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
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {isProcessing && results.length === 0 && (
          <Card>
            <CardContent className="py-8 flex items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Running batch verification…
            </CardContent>
          </Card>
        )}

        {!isProcessing && results.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium">No results yet</p>
              <p className="text-sm mt-1">Upload a CSV to get Pass / Review / Fail decisions with reason codes per row.</p>
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Verification Results</CardTitle>
                <CardDescription>
                  {results.length} processed • {summary.pass} pass • {summary.review} review • {summary.fail} fail
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
                    <TableHead>Candidate</TableHead>
                    <TableHead>Issuer</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason codes</TableHead>
                    <TableHead className="text-right">Risk</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium leading-tight">{row.name}</p>
                          <p className="text-xs font-mono text-muted-foreground truncate">{row.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{row.issuer}</TableCell>
                      <TableCell>{renderDecisionBadge(row)}</TableCell>
                      <TableCell>{renderStatusBadge(row)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(row.riskFlags || []).length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            (row.riskFlags || []).slice(0, 3).map((c, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] font-mono">
                                {normalizeReasonCode(c)}
                              </Badge>
                            ))
                          )}
                          {(row.riskFlags || []).length > 3 && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              +{(row.riskFlags || []).length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{row.riskScore}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`View details for ${row.name}`}
                          onClick={() => setSelectedVerification(row)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Optimization: Hoist Dialog to reduce DOM nodes and improve performance for large lists */}
      <Dialog open={!!selectedVerification} onOpenChange={(open) => !open && setSelectedVerification(null)}>
        <DialogContent className="max-w-2xl">
          {selectedVerification && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-4">
                  <span className="truncate">
                    {selectedVerification.name} — {renderDecisionBadge(selectedVerification)}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(selectedVerification.id)} aria-label="Copy Verification ID">
                        <Clipboard className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy Verification ID</p>
                    </TooltipContent>
                  </Tooltip>
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border rounded-lg p-3 bg-muted/10">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Status</p>
                  <div className="mt-2 flex items-center justify-between">
                    {renderStatusBadge(selectedVerification)}
                    <p className="text-sm font-mono text-muted-foreground">Risk {selectedVerification.riskScore}</p>
                  </div>
                  {typeof selectedVerification.confidence === "number" && (
                    <p className="text-xs text-muted-foreground mt-2">Confidence: {Math.round(selectedVerification.confidence)}%</p>
                  )}
                </div>

                <div className="border rounded-lg p-3 bg-muted/10">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Reason codes</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(selectedVerification.riskFlags || []).length === 0 ? (
                      <span className="text-sm text-muted-foreground">No risk flags</span>
                    ) : (
                      (selectedVerification.riskFlags || []).slice(0, 12).map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] font-mono">
                          {normalizeReasonCode(c)}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Evidence (checks)</p>
                {(selectedVerification.checks || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground border rounded-lg p-3">No check details returned.</div>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
                    {(selectedVerification.checks || []).map((c, i) => (
                      <div key={i} className="border rounded-lg p-3 bg-background">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <Badge variant={c.status === "passed" ? "outline" : c.status === "warning" ? "secondary" : c.status === "skipped" ? "secondary" : "destructive"} className="text-xs">
                            {c.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{c.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="border rounded-lg p-3 bg-muted/10">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Signature</p>
                  <p className="text-xs text-muted-foreground mt-2">Proof type: {String(findEvidence(selectedVerification.checks, "Signature Validation")?.details?.proofType ?? "unknown")}</p>
                </div>
                <div className="border rounded-lg p-3 bg-muted/10">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Issuer</p>
                  <p className="text-xs text-muted-foreground mt-2">{String(findEvidence(selectedVerification.checks, "Issuer Verification")?.details?.issuerName ?? selectedVerification.issuer)}</p>
                </div>
                <div className="border rounded-lg p-3 bg-muted/10">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Anchor hash</p>
                  <p className="text-xs font-mono text-muted-foreground mt-2 truncate">{String(findEvidence(selectedVerification.checks, "Blockchain Anchor")?.details?.hash ?? "—")}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
