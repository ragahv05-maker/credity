import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { QrCode, FileText, Link as LinkIcon, CheckCircle, AlertOctagon, Download, ShieldCheck, Loader2, Building, AlertTriangle, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface VerificationCheck {
  name: string;
  status: "passed" | "failed" | "warning" | "skipped";
  message: string;
  details?: any;
}

interface VerificationResult {
  status: "verified" | "failed" | "suspicious" | "pending";
  confidence: number;
  checks: VerificationCheck[];
  riskScore: number;
  riskFlags: string[];
  timestamp: string;
  verificationId: string;
}

type FraudFlag =
  | string
  | {
      type?: string;
      severity?: string;
      description?: string;
      message?: string;
    };

interface FraudAnalysis {
  score: number;
  ruleScore?: number;
  aiScore?: number;
  flags: FraudFlag[];
  recommendation: "accept" | "approve" | "review" | "reject";
  details: { check: string; status?: string; message?: string; result?: string; impact?: number }[];
  ai?: {
    provider: string;
    score: number;
    confidence: number;
    summary: string;
    signals: Array<{ code: string; severity: string; message: string }>;
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
}

type ViewState = "idle" | "verifying" | "result";

async function readApiError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data?.error || data?.message || fallback;
  } catch {
    const text = await response.text();
    return text || fallback;
  }
}

export default function InstantVerify() {
  const { toast } = useToast();
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [jwtInput, setJwtInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [fraudAnalysis, setFraudAnalysis] = useState<FraudAnalysis | null>(null);
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopProgress = () => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  };

  const startProgress = () => {
    stopProgress();
    setProgress(0);
    progressTimer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) return 95;
        return p + 5;
      });
    }, 120);
  };

  useEffect(() => () => stopProgress(), []);

  const verifyMutation = useMutation({
    mutationFn: async (payload: { jwt?: string; credential?: any }) => {
      const response = await fetch("/api/verify/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          verifiedBy: "Recruiter Portal User",
        }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Verification failed"));
      return response.json();
    },
    onSuccess: (data) => {
      stopProgress();
      setProgress(100);
      setVerificationResult(data.verification);
      setFraudAnalysis(data.fraud);
      setRecord(data.record);
      setViewState("result");
    },
    onError: (error) => {
      stopProgress();
      toast({ title: "Verification failed", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
      setViewState("idle");
    },
  });

  const verifyLinkMutation = useMutation({
    mutationFn: async (link: string) => {
      const response = await fetch("/api/verify/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Link verification failed"));
      return response.json();
    },
    onSuccess: (data) => {
      stopProgress();
      setProgress(100);
      setVerificationResult(data.verification);
      setFraudAnalysis(data.fraud);
      setRecord(data.record);
      setViewState("result");
      toast({ title: "Link verification complete", description: `Status: ${data.verification.status}` });
    },
    onError: (error) => {
      stopProgress();
      toast({
        title: "Link verification failed",
        description:
          error instanceof Error
            ? error.message
            : "Ensure the URL is reachable and your session has verification permission.",
        variant: "destructive",
      });
      setViewState("idle");
    },
  });

  const handleVerify = (jwt?: string, credential?: any) => {
    setViewState("verifying");
    startProgress();
    verifyMutation.mutate({ jwt, credential });
  };

  const handleVerifyLink = () => {
    setViewState("verifying");
    startProgress();
    verifyLinkMutation.mutate(linkInput.trim());
  };

  const reset = () => {
    stopProgress();
    setViewState("idle");
    setVerificationResult(null);
    setFraudAnalysis(null);
    setRecord(null);
    setProgress(0);
    setJwtInput("");
    setLinkInput("");
  };

  const getCheckIcon = (status: string) => {
    switch (status) {
      case "passed": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "failed": return <AlertOctagon className="w-4 h-4 text-red-500" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <Eye className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <DashboardLayout title="Instant Verification">
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-8 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold tracking-tight">Verify a Credential</h2>
              <p className="text-muted-foreground mt-2">Authenticate credentials in seconds using our trusted verification engine.</p>
            </div>

            <Card className="border-sidebar-border/20 shadow-lg">
              <CardContent className="p-6">
                <Tabs defaultValue="jwt" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="scan"><QrCode className="w-4 h-4 mr-2" /> Scan QR</TabsTrigger>
                    <TabsTrigger value="jwt"><FileText className="w-4 h-4 mr-2" /> JWT</TabsTrigger>
                    <TabsTrigger value="link"><LinkIcon className="w-4 h-4 mr-2" /> Link</TabsTrigger>
                  </TabsList>

                  <TabsContent value="scan" className="space-y-4">
                    <div className="aspect-square bg-black/90 rounded-lg relative overflow-hidden flex items-center justify-center border-2 border-dashed border-muted-foreground/50">
                      <div className="scan-line z-10"></div>
                      <QrCode className="w-24 h-24 text-muted-foreground/30" />
                      <p className="absolute bottom-4 text-white/70 text-sm">Point camera at QR code</p>
                    </div>
                    <Button className="w-full" variant="outline" onClick={() => toast({ title: "Use Live QR Scan", description: "QR capture is available in the mobile app flow for production verification." })}>
                      Activate Camera
                    </Button>
                  </TabsContent>

                  <TabsContent value="jwt" className="space-y-4">
                    <div className="space-y-2">
                      <Label>VC-JWT Token</Label>
                      <Textarea
                        placeholder="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
                        className="min-h-[150px] font-mono text-xs"
                        value={jwtInput}
                        onChange={(e) => setJwtInput(e.target.value)}
                      />
                    </div>
                    <Button className="w-full" onClick={() => handleVerify(jwtInput)} disabled={!jwtInput.trim() || verifyMutation.isPending}>
                      {verifyMutation.isPending ? "Verifying..." : "Verify JWT"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="link" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Credential URL</Label>
                      <Input
                        placeholder="https://issuer.example.com/api/v1/public/issuance/offer/consume?token=..."
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                      />
                    </div>
                    <Button className="w-full" onClick={handleVerifyLink} disabled={!linkInput.trim() || verifyLinkMutation.isPending}>
                      {verifyLinkMutation.isPending ? "Verifying..." : "Verify Link"}
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              {viewState === "idle" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center text-center p-12 border rounded-xl border-dashed border-muted-foreground/20 bg-muted/10 min-h-[500px]">
                  <ShieldCheck className="w-16 h-16 text-muted-foreground/20 mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground/50">Ready to Verify</h3>
                  <p className="text-muted-foreground/40 max-w-xs mx-auto mt-2">Results will appear here instantly after scanning or uploading a credential.</p>
                </motion.div>
              )}

              {viewState === "verifying" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center p-12 border rounded-xl bg-background min-h-[500px] shadow-lg relative overflow-hidden">
                  <motion.div className="absolute w-full h-1 bg-primary/30 blur-md top-0" animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 2.5, ease: "linear", repeat: Infinity }} />

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative mb-8">
                      <motion.div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
                      <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                    </div>

                    <h3 className="text-xl font-bold tracking-tight">Verifying Credential...</h3>
                    <div className="w-80 mt-8"><Progress value={progress} className="h-3" /></div>
                    <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground font-mono bg-muted/20 p-4 rounded-lg border w-full max-w-xs">
                      <p className={progress > 20 ? "text-primary" : ""}>{progress > 20 ? "✓" : "○"} Parsing credential format...</p>
                      <p className={progress > 40 ? "text-primary" : ""}>{progress > 40 ? "✓" : "○"} Validating signature...</p>
                      <p className={progress > 60 ? "text-primary" : ""}>{progress > 60 ? "✓" : "○"} Checking issuer registry...</p>
                      <p className={progress > 80 ? "text-primary" : ""}>{progress > 80 ? "✓" : "○"} Running fraud analysis...</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {viewState === "result" && verificationResult && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full">
                  <Card className={`h-full border-t-4 shadow-xl overflow-hidden flex flex-col ${verificationResult.status === "verified" ? "border-t-emerald-500" : verificationResult.status === "suspicious" ? "border-t-amber-500" : "border-t-red-500"}`}>
                    <div className={`p-6 text-center border-b ${verificationResult.status === "verified" ? "bg-emerald-50/50 border-emerald-100" : verificationResult.status === "suspicious" ? "bg-amber-50/50 border-amber-100" : "bg-red-50/50 border-red-100"}`}>
                      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${verificationResult.status === "verified" ? "bg-emerald-100 text-emerald-600" : verificationResult.status === "suspicious" ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"}`}>
                        {verificationResult.status === "verified" ? <CheckCircle className="w-8 h-8" /> : verificationResult.status === "suspicious" ? <AlertTriangle className="w-8 h-8" /> : <AlertOctagon className="w-8 h-8" />}
                      </motion.div>
                      <h2 className={`text-2xl font-bold ${verificationResult.status === "verified" ? "text-emerald-900" : verificationResult.status === "suspicious" ? "text-amber-900" : "text-red-900"}`}>
                        {verificationResult.status === "verified" ? "Credential Verified" : verificationResult.status === "suspicious" ? "Review Required" : "Verification Failed"}
                      </h2>
                      <div className="flex items-center justify-center gap-4 mt-3">
                        <Badge variant="outline" className="font-mono">Confidence: {verificationResult.confidence}%</Badge>
                        <Badge variant={verificationResult.riskScore > 40 ? "destructive" : "secondary"}>Risk Score: {verificationResult.riskScore}</Badge>
                      </div>
                    </div>

                    <CardContent className="p-0 flex-1 bg-background overflow-auto">
                      <div className="p-6 space-y-6">
                        {record && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><p className="text-xs text-muted-foreground uppercase font-semibold">Subject</p><p className="font-medium text-lg">{record.subject}</p></div>
                            <div className="space-y-1"><p className="text-xs text-muted-foreground uppercase font-semibold">Credential</p><p className="font-medium">{record.credentialType}</p></div>
                            <div className="space-y-1"><p className="text-xs text-muted-foreground uppercase font-semibold">Issuer</p><div className="flex items-center gap-2"><Building className="w-4 h-4 text-muted-foreground" /><p className="font-medium">{record.issuer}</p></div></div>
                            <div className="space-y-1"><p className="text-xs text-muted-foreground uppercase font-semibold">Recommendation</p><Badge className={record.recommendation === "approve" || record.recommendation === "accept" ? "bg-emerald-100 text-emerald-700" : record.recommendation === "review" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>{record.recommendation.toUpperCase()}</Badge></div>
                          </div>
                        )}

                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Verification Checks</p>
                          <div className="space-y-2">
                            {(verificationResult.checks || []).length === 0 ? (
                              <div className="text-sm text-muted-foreground border rounded-lg p-3">No check details were returned by the verifier.</div>
                            ) : (
                              verificationResult.checks.map((check, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                                  {getCheckIcon(check.status)}
                                  <div className="flex-1"><p className="font-medium text-sm">{check.name}</p><p className="text-xs text-muted-foreground">{check.message}</p></div>
                                  <Badge variant={check.status === "passed" ? "outline" : check.status === "warning" ? "secondary" : "destructive"} className="text-xs">{check.status}</Badge>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {verificationResult.riskFlags.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Risk Flags</p>
                            <div className="flex flex-wrap gap-2">
                              {verificationResult.riskFlags.map((flag, i) => (
                                <Badge key={i} variant="destructive" className="text-xs">{flag.replace(/_/g, " ")}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {fraudAnalysis && (
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Fraud Analysis (Score: {fraudAnalysis.score}/100){typeof fraudAnalysis.ruleScore === "number" && typeof fraudAnalysis.aiScore === "number" ? ` · Rules ${fraudAnalysis.ruleScore} / AI ${fraudAnalysis.aiScore}` : ""}</p>
                            {fraudAnalysis.ai && (
                              <div className="p-3 bg-blue-50 border border-blue-100 rounded text-sm space-y-1">
                                <p className="font-medium text-blue-800">AI Copilot ({fraudAnalysis.ai.provider}) · Confidence {Math.round(fraudAnalysis.ai.confidence * 100)}%</p>
                                <p className="text-blue-700">{fraudAnalysis.ai.summary}</p>
                              </div>
                            )}
                            {fraudAnalysis.flags.length > 0 && (
                              <div className="space-y-2">
                                {fraudAnalysis.flags.map((flag, i) => {
                                  const normalized = typeof flag === "string" ? { type: flag, description: flag.replace(/_/g, " ") } : { type: flag.type || "RISK_SIGNAL", description: flag.description || flag.message || flag.type || "Risk signal" };
                                  return <div key={i} className="p-2 bg-red-50 border border-red-100 rounded text-sm"><span className="font-medium text-red-700">{normalized.type}:</span> <span className="text-red-600">{normalized.description}</span></div>;
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-3 pt-4">
                          <Button className="flex-1" variant="outline"><Download className="w-4 h-4 mr-2" /> Export Report</Button>
                          <Button className="flex-1" variant="default" onClick={reset}>Verify Another</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
