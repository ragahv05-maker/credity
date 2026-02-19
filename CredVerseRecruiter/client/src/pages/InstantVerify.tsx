import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  VerifyInputSection,
  VerifyIdleState,
  VerifyLoadingState,
  VerifyResult,
  readApiError,
  VerificationResult,
  FraudAnalysis,
  VerificationRecord,
  ViewState,
} from "@/components/instant-verify";

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
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
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
    setProgress(0);
    setJwtInput("");
    setLinkInput("");
  };

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

            <VerifyInputSection
              jwtInput={jwtInput}
              setJwtInput={setJwtInput}
              linkInput={linkInput}
              setLinkInput={setLinkInput}
              onVerifyJwt={() => handleVerify(jwtInput)}
              onVerifyLink={handleVerifyLink}
              isVerifyingJwt={verifyMutation.isPending}
              isVerifyingLink={verifyLinkMutation.isPending}
            />
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              {viewState === "idle" && <VerifyIdleState />}

              {viewState === "verifying" && <VerifyLoadingState progress={progress} />}

              {viewState === "result" && verificationResult && (
                <VerifyResult
                  verificationResult={verificationResult}
                  fraudAnalysis={fraudAnalysis}
                  record={record}
                  onReset={reset}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
