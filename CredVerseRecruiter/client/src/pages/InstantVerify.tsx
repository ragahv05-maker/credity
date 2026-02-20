import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  QrCode,
  FileText,
  Link as LinkIcon,
  CheckCircle,
  AlertOctagon,
  Download,
  ShieldCheck,
  Loader2,
  Building,
  AlertTriangle,
  Eye,
  ChevronDown,
  History,
  ExternalLink,
  Clipboard,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface VerificationCheck {
  name: string;
  status: "passed" | "failed" | "warning" | "skipped";
  message: string;
  details?: Record<string, unknown>;
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

type DecisionTier = "PASS" | "REVIEW" | "FAIL";

function normalizeReasonCode(code: string) {
  return String(code || "")
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function getDecisionTier(args: { status?: string; recommendation?: string; riskScore?: number; fraudScore?: number }): DecisionTier {
  const rec = String(args.recommendation || "").toLowerCase();
  if (rec === "reject") return "FAIL";
  if (rec === "review") return "REVIEW";
  if (rec === "approve" || rec === "accept") return "PASS";

  const status = String(args.status || "").toLowerCase();
  if (status === "failed") return "FAIL";
  if (status === "suspicious" || status === "pending") return "REVIEW";
  if (status === "verified") return "PASS";

  const risk = Number(args.riskScore ?? 0);
  const fraud = Number(args.fraudScore ?? 0);
  if (risk >= 60 || fraud >= 60) return "FAIL";
  if (risk >= 30 || fraud >= 30) return "REVIEW";
  return "PASS";
}

function decisionCopy(tier: DecisionTier) {
  switch (tier) {
    case "PASS":
      return {
        title: "Pass",
        subtitle: "Credential looks authentic.",
        tone: "emerald" as const,
      };
    case "REVIEW":
      return {
        title: "Review",
        subtitle: "Risk signals detected. Verify before proceeding.",
        tone: "amber" as const,
      };
    case "FAIL":
      return {
        title: "Fail",
        subtitle: "High fraud risk or invalid credential.",
        tone: "red" as const,
      };
  }
}

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
  const [trustHistory, setTrustHistory] = useState<VerificationRecord[] | null>(null);
  const [trustHistoryError, setTrustHistoryError] = useState<string | null>(null);
  const [trustHistoryLoading, setTrustHistoryLoading] = useState(false);

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
    mutationFn: async (payload: { jwt?: string; credential?: unknown }) => {
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

  const handleVerify = (jwt?: string, credential?: unknown) => {
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
    setTrustHistory(null);
    setTrustHistoryError(null);
    setTrustHistoryLoading(false);
    setProgress(0);
    setJwtInput("");
    setLinkInput("");
  };

  const getCheckIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "failed":
        return <AlertOctagon className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Eye className="w-4 h-4 text-gray-400" />;
    }
  };

  const decision = useMemo(() => {
    const tier = getDecisionTier({
      status: verificationResult?.status,
      recommendation: fraudAnalysis?.recommendation || record?.recommendation,
      riskScore: verificationResult?.riskScore ?? record?.riskScore,
      fraudScore: fraudAnalysis?.score ?? record?.fraudScore,
    });
    return { tier, ...decisionCopy(tier) };
  }, [verificationResult?.status, verificationResult?.riskScore, fraudAnalysis?.recommendation, fraudAnalysis?.score, record?.recommendation, record?.riskScore, record?.fraudScore]);

  const reasonCodes = useMemo(() => {
    const fromRiskFlags = (verificationResult?.riskFlags || []).map((c) => ({ source: "verifier" as const, code: String(c) }));
    const fromAiSignals = (fraudAnalysis?.ai?.signals || []).map((s) => ({ source: "ai" as const, code: String(s.code), severity: s.severity, message: s.message }));
    const fromFraudFlags = (fraudAnalysis?.flags || []).map((f) => {
      if (typeof f === "string") return { source: "fraud" as const, code: f };
      return { source: "fraud" as const, code: f.type || f.message || "FRAUD_SIGNAL", severity: f.severity, message: f.description || f.message };
    });

    const merged = [...fromRiskFlags, ...fromAiSignals, ...fromFraudFlags]
      .filter((x) => String(x.code || "").trim().length > 0)
      .map((x) => ({ ...x, code: String(x.code).trim() }));

    // de-dup by code
    const seen = new Set<string>();
    const unique: typeof merged = [];
    for (const item of merged) {
      const key = item.code.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }

    return unique;
  }, [verificationResult?.riskFlags, fraudAnalysis?.ai?.signals, fraudAnalysis?.flags]);

  const evidence = useMemo(() => {
    const checks = verificationResult?.checks || [];
    const find = (name: string) => checks.find((c) => c.name === name);
    return {
      signature: find("Signature Validation"),
      issuer: find("Issuer Verification"),
      anchor: find("Blockchain Anchor"),
      revocation: find("Revocation Check"),
      did: find("DID Resolution"),
    };
  }, [verificationResult?.checks]);

  // Trust history: pull recent verifications and filter client-side by current record
  useEffect(() => {
    const subject = record?.subject;
    const issuer = record?.issuer;
    const credentialType = record?.credentialType;
    const currentId = record?.id;

    if (!subject || !issuer || !credentialType || viewState !== "result") return;

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
  }, [record?.subject, record?.issuer, record?.credentialType, record?.id, viewState]);

  const toneClasses =
    decision.tone === "emerald"
      ? {
          border: "border-t-emerald-500",
          headerBg: "bg-emerald-50/60 border-emerald-100",
          pill: "bg-emerald-100 text-emerald-700",
          iconWrap: "bg-emerald-100 text-emerald-600",
          title: "text-emerald-950",
        }
      : decision.tone === "amber"
        ? {
            border: "border-t-amber-500",
            headerBg: "bg-amber-50/60 border-amber-100",
            pill: "bg-amber-100 text-amber-700",
            iconWrap: "bg-amber-100 text-amber-600",
            title: "text-amber-950",
          }
        : {
            border: "border-t-red-500",
            headerBg: "bg-red-50/60 border-red-100",
            pill: "bg-red-100 text-red-700",
            iconWrap: "bg-red-100 text-red-600",
            title: "text-red-950",
          };

  const statusIcon = decision.tier === "PASS" ? <CheckCircle className="w-8 h-8" /> : decision.tier === "REVIEW" ? <AlertTriangle className="w-8 h-8" /> : <AlertOctagon className="w-8 h-8" />;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: text.slice(0, 80) + (text.length > 80 ? "…" : "") });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handlePaste = async (setter: (val: string) => void) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setter(text);
        toast({ title: "Pasted from clipboard" });
      }
    } catch {
      toast({
        title: "Paste failed",
        description: "Check clipboard permissions",
        variant: "destructive",
      });
    }
  };

  const PasteActions = ({ onPaste, onClear, hasValue }: { onPaste: () => void; onClear: () => void; hasValue: boolean }) => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onPaste}>
        <Clipboard className="w-3 h-3 mr-1" /> Paste
      </Button>
      {hasValue && (
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClear}>
          <X className="w-3 h-3 mr-1" /> Clear
        </Button>
      )}
    </div>
  );

  return (
    <DashboardLayout title="Instant Verification">
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-8 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold tracking-tight">Verify a Credential</h2>
              <p className="text-muted-foreground mt-2">
                Get a clear Pass / Review / Fail decision, confidence, reason codes, and evidence.
              </p>
            </div>

            <Card className="border-sidebar-border/20 shadow-lg">
              <CardContent className="p-6">
                <Tabs defaultValue="jwt" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="scan">
                      <QrCode className="w-4 h-4 mr-2" /> Scan QR
                    </TabsTrigger>
                    <TabsTrigger value="jwt">
                      <FileText className="w-4 h-4 mr-2" /> JWT
                    </TabsTrigger>
                    <TabsTrigger value="link">
                      <LinkIcon className="w-4 h-4 mr-2" /> Link
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="scan" className="space-y-4">
                    <div className="aspect-square bg-black/90 rounded-lg relative overflow-hidden flex items-center justify-center border-2 border-dashed border-muted-foreground/50">
                      <div className="scan-line z-10"></div>
                      <QrCode className="w-24 h-24 text-muted-foreground/30" />
                      <p className="absolute bottom-4 text-white/70 text-sm">Point camera at QR code</p>
                    </div>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() =>
                        toast({
                          title: "Use Live QR Scan",
                          description: "QR capture is available in the mobile app flow for production verification.",
                        })
                      }
                    >
                      Activate Camera
                    </Button>
                  </TabsContent>

                  <TabsContent value="jwt" className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>VC-JWT Token</Label>
                        <PasteActions onPaste={() => handlePaste(setJwtInput)} onClear={() => setJwtInput("")} hasValue={!!jwtInput} />
                      </div>
                      <Textarea
                        placeholder="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
                        className="min-h-[150px] font-mono text-xs"
                        value={jwtInput}
                        onChange={(e) => setJwtInput(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleVerify(jwtInput)}
                      disabled={!jwtInput.trim() || verifyMutation.isPending}
                    >
                      {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {verifyMutation.isPending ? "Verifying..." : "Verify JWT"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="link" className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Credential URL</Label>
                        <PasteActions onPaste={() => handlePaste(setLinkInput)} onClear={() => setLinkInput("")} hasValue={!!linkInput} />
                      </div>
                      <Input
                        placeholder="https://issuer.example.com/api/v1/public/issuance/offer/consume?token=..."
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleVerifyLink}
                      disabled={!linkInput.trim() || verifyLinkMutation.isPending}
                    >
                      {verifyLinkMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12 border rounded-xl border-dashed border-muted-foreground/20 bg-muted/10 min-h-[520px]"
                >
                  <ShieldCheck className="w-16 h-16 text-muted-foreground/20 mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground/60">Ready to Verify</h3>
                  <p className="text-muted-foreground/50 max-w-sm mx-auto mt-2">
                    Paste a JWT or verify a link. You’ll get an instant decision with reason codes and evidence.
                  </p>
                </motion.div>
              )}

              {viewState === "verifying" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center p-12 border rounded-xl bg-background min-h-[520px] shadow-lg relative overflow-hidden"
                >
                  <motion.div
                    className="absolute w-full h-1 bg-primary/30 blur-md top-0"
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2.5, ease: "linear", repeat: Infinity }}
                  />

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative mb-8">
                      <motion.div
                        className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                    </div>

                    <h3 className="text-xl font-bold tracking-tight">Verifying…</h3>
                    <div className="w-80 mt-8">
                      <Progress value={progress} className="h-3" />
                    </div>
                    <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground font-mono bg-muted/20 p-4 rounded-lg border w-full max-w-xs">
                      <p className={progress > 20 ? "text-primary" : ""}>{progress > 20 ? "✓" : "○"} Parsing credential format…</p>
                      <p className={progress > 40 ? "text-primary" : ""}>{progress > 40 ? "✓" : "○"} Validating signature…</p>
                      <p className={progress > 60 ? "text-primary" : ""}>{progress > 60 ? "✓" : "○"} Checking issuer registry…</p>
                      <p className={progress > 80 ? "text-primary" : ""}>{progress > 80 ? "✓" : "○"} Running fraud analysis…</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {viewState === "result" && verificationResult && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="h-full">
                  <Card className={`h-full border-t-4 shadow-xl overflow-hidden flex flex-col ${toneClasses.border}`}>
                    <div className={`p-6 border-b ${toneClasses.headerBg}`}>
                      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-start gap-4">
                          <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm ${toneClasses.iconWrap}`}
                          >
                            {statusIcon}
                          </motion.div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className={`text-2xl font-bold tracking-tight ${toneClasses.title}`}>{decision.title}</h2>
                              <Badge className={`${toneClasses.pill} border-0`}>{decision.tier}</Badge>
                              <span className="text-xs text-muted-foreground font-mono truncate">ID: {verificationResult.verificationId}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{decision.subtitle}</p>
                          </div>
                        </div>

                        <div className="w-full md:w-[320px] rounded-xl border bg-background/60 p-4">
                          <div className="flex items-baseline justify-between">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Confidence</p>
                            <p className="text-sm font-semibold">{Math.round(Number(verificationResult.confidence ?? 0))}%</p>
                          </div>
                          <Progress value={Math.round(Number(verificationResult.confidence ?? 0))} className="h-2 mt-2" />

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant={Number(verificationResult.riskScore ?? 0) >= 50 ? "destructive" : Number(verificationResult.riskScore ?? 0) >= 30 ? "secondary" : "outline"}>
                              Risk {Number(verificationResult.riskScore ?? 0)}
                            </Badge>
                            {typeof fraudAnalysis?.score === "number" && (
                              <Badge variant={fraudAnalysis.score >= 60 ? "destructive" : fraudAnalysis.score >= 30 ? "secondary" : "outline"}>
                                Fraud {Math.round(fraudAnalysis.score)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {record && (
                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Subject</p>
                            <p className="font-medium text-lg leading-tight">{record.subject}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Credential</p>
                            <p className="font-medium leading-tight">{record.credentialType}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Issuer</p>
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-muted-foreground" />
                              <p className="font-medium leading-tight">{record.issuer}</p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Recommendation</p>
                            <Badge className={String(record.recommendation).toLowerCase() === "review" ? "bg-amber-100 text-amber-700" : String(record.recommendation).toLowerCase() === "reject" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}>
                              {String(record.recommendation).toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-0 flex-1 bg-background overflow-auto">
                      <div className="p-6 space-y-6">
                        {/* Top reasons */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Top reasons</p>
                            {reasonCodes.length > 0 && (
                              <p className="text-xs text-muted-foreground font-mono">{reasonCodes.length} codes</p>
                            )}
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
                                        <Badge
                                          variant={r.source === "ai" ? "outline" : "secondary"}
                                          className="text-xs font-mono"
                                        >
                                          {normalizeReasonCode(r.code)}
                                        </Badge>
                                        {("severity" in r && r.severity) ? (
                                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                            {String(r.severity)}
                                          </span>
                                        ) : null}
                                      </div>
                                      {("message" in r && r.message) ? (
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.message}</p>
                                      ) : null}
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
                                      <Badge
                                        key={i}
                                        variant={r.source === "ai" ? "outline" : "secondary"}
                                        className="text-xs font-mono"
                                      >
                                        {normalizeReasonCode(r.code)}
                                      </Badge>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          )}
                        </div>

{/* What to do next */}
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
                                  <p className="text-xs text-muted-foreground mt-1">Ask for transcripts, offer letters, or issuer contact verification.</p>
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
                                  <p className="text-xs text-muted-foreground mt-1">Flag for compliance review and do not proceed until resolved.</p>
                                </div>
                                <div className="border rounded-lg p-3 bg-muted/20">
                                  <p className="text-sm font-medium">Collect fresh credential</p>
                                  <p className="text-xs text-muted-foreground mt-1">Ask candidate to re-issue from a verified issuer (new proof + anchor).</p>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" size="sm" onClick={() => copyToClipboard(verificationResult.verificationId)}>
                              <Clipboard className="w-4 h-4 mr-2" /> Copy verification ID
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => toast({ title: "Coming soon", description: "Report export is a UI stub in this sprint." })}>
                              <Download className="w-4 h-4 mr-2" /> Export report
                            </Button>
                            <Button size="sm" onClick={reset}>
                              Verify another
                            </Button>
                          </div>
                        </div>

                        {/* Evidence + Trust History */}
                        <div className="grid gap-4 lg:grid-cols-2">
                          <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Evidence</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Verifier checks</p>
                                {(verificationResult.checks || []).length === 0 ? (
                                  <div className="text-sm text-muted-foreground border rounded-lg p-3">No check details were returned by the verifier.</div>
                                ) : (
                                  <div className="space-y-2">
                                    {verificationResult.checks.map((check, i) => (
                                      <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border">
                                        <div className="mt-0.5">{getCheckIcon(check.status)}</div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-3">
                                            <p className="font-medium text-sm truncate">{check.name}</p>
                                            <Badge variant={check.status === "passed" ? "outline" : check.status === "warning" ? "secondary" : check.status === "skipped" ? "secondary" : "destructive"} className="text-xs">
                                              {check.status}
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Proof / Anchor metadata</p>
                                <div className="grid gap-2">
                                  <div className="border rounded-lg p-3 bg-muted/10">
                                    <p className="text-sm font-medium">Signature</p>
                                    <p className="text-xs text-muted-foreground mt-1">Proof type: {String(evidence.signature?.details?.proofType ?? "unknown")}</p>
                                    {typeof evidence.signature?.details?.issuer === "string" && (
                                      <div className="mt-2 flex items-center justify-between gap-2">
                                        <p className="text-xs font-mono text-muted-foreground truncate">Issuer: {String(evidence.signature.details.issuer)}</p>
                                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(String(evidence.signature?.details?.issuer))}>
                                          <Clipboard className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="border rounded-lg p-3 bg-muted/10">
                                    <p className="text-sm font-medium">Issuer Trust</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {evidence.issuer?.details?.trusted === true
                                        ? `Trusted issuer: ${String(evidence.issuer?.details?.issuerName ?? record?.issuer ?? "")}`
                                        : `Issuer not fully verified: ${String(evidence.issuer?.details?.issuerName ?? record?.issuer ?? "")}`}
                                    </p>
                                    {typeof evidence.issuer?.details?.did === "string" && (
                                      <div className="mt-2 flex items-center justify-between gap-2">
                                        <p className="text-xs font-mono text-muted-foreground truncate">DID: {String(evidence.issuer.details.did)}</p>
                                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(String(evidence.issuer?.details?.did))}>
                                          <Clipboard className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="border rounded-lg p-3 bg-muted/10">
                                    <p className="text-sm font-medium">Blockchain Anchor</p>
                                    <p className="text-xs text-muted-foreground mt-1">{String(evidence.anchor?.message ?? "Not provided")}</p>
                                    {typeof evidence.anchor?.details?.hash === "string" && (
                                      <div className="mt-2 flex items-center justify-between gap-2">
                                        <p className="text-xs font-mono text-muted-foreground truncate">Hash: {String(evidence.anchor.details.hash)}</p>
                                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(String(evidence.anchor?.details?.hash))}>
                                          <Clipboard className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    )}
                                    {typeof evidence.anchor?.details?.issuer === "string" && (
                                      <p className="text-xs font-mono text-muted-foreground mt-1 truncate">Issuer (on-chain): {String(evidence.anchor.details.issuer)}</p>
                                    )}
                                    {typeof evidence.anchor?.details?.timestamp === "number" && (
                                      <p className="text-xs text-muted-foreground mt-1">Anchored at: {new Date(Number(evidence.anchor.details.timestamp) * 1000).toLocaleString()}</p>
                                    )}
                                    {typeof evidence.anchor?.details?.compatibilityMode === "string" && (
                                      <p className="text-[11px] text-muted-foreground mt-1">Mode: {String(evidence.anchor.details.compatibilityMode)}</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {fraudAnalysis?.ai && (
                                <div className="border rounded-lg p-3 bg-blue-50/70 border-blue-100">
                                  <p className="text-sm font-medium text-blue-900">AI Copilot ({fraudAnalysis.ai.provider})</p>
                                  <p className="text-xs text-blue-800 mt-1">Confidence: {Math.round((fraudAnalysis.ai.confidence ?? 0) * 100)}%</p>
                                  <p className="text-sm text-blue-900 mt-2">{fraudAnalysis.ai.summary}</p>
                                  {fraudAnalysis.ai.signals?.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      {fraudAnalysis.ai.signals.slice(0, 5).map((s, i) => (
                                        <div key={i} className="text-xs text-blue-900 flex items-start gap-2">
                                          <Badge variant="outline" className="font-mono text-[10px]">{normalizeReasonCode(s.code)}</Badge>
                                          <span className="text-blue-800">{s.message}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>

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
                                        <Badge variant={String(h.status) === "verified" ? "outline" : String(h.status) === "failed" ? "destructive" : "secondary"}>
                                          {String(h.status).toUpperCase()}
                                        </Badge>
                                      </div>
                                      <div className="mt-2 flex items-center justify-between gap-3">
                                        <p className="text-xs text-muted-foreground">Risk {h.riskScore} · Fraud {h.fraudScore}</p>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toast({ title: "Tip", description: "History links can be wired to a details page using /api/analytics/verifications/:id." })}
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
