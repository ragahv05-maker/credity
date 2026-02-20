import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Download, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBiometrics } from "@/hooks/use-biometrics";

export default function ReceiveCredential() {
  const [step, setStep] = useState<"input" | "scanning" | "processing" | "success">("input");
  const [url, setUrl] = useState("");
  const { toast } = useToast();
  const { verifyBiometrics } = useBiometrics();

  const handleProcess = async () => {
    if (!url && step === 'input') {
      toast({ title: "Error", description: "Please enter a URL", variant: "destructive" });
      return;
    }

    const targetUrl = url.trim();
    if (!targetUrl) {
      toast({ title: "Error", description: "Credential offer URL is required", variant: "destructive" });
      return;
    }

    // 1. Verify Biometrics before claiming
    try {
      const verification = await verifyBiometrics('1');
      if (!verification.success) {
        toast({ title: "Authentication Failed", description: "Biometric verification required to add credentials", variant: "destructive" });
        return;
      }
    } catch (e) {
      toast({ title: "Error", description: "Biometric verification unavailable", variant: "destructive" });
      return;
    }

    setStep("processing");

    try {
      // Call Wallet API to claim the offer
      // We assume User ID 1 for MVP (or get from context)
      const response = await fetch('/api/wallet/offer/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1,
          url: targetUrl
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to claim");
      }

      setStep("success");
      toast({
        title: "Credential Received",
        description: "Successfully imported verified credential.",
      });
    } catch (error: any) {
      setStep("input");
      toast({
        title: "Claim Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 md:ml-64 flex flex-col items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Receive Credential</h1>
            <p className="text-muted-foreground mt-2">Scan a QR code or paste a W3C Verifiable Credential link.</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              {step === "input" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-32 flex flex-col gap-2 hover:border-primary hover:bg-secondary/50"
                      onClick={() => setStep("scanning")}
                    >
                      <QrCode className="w-8 h-8 text-muted-foreground" />
                      Scan QR Code
                    </Button>
                    <Button
                      variant="outline"
                      className="h-32 flex flex-col gap-2 hover:border-primary hover:bg-secondary/50"
                    >
                      <Download className="w-8 h-8 text-muted-foreground" />
                      Upload File
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or paste link</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="https://issuer.com/vc/..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                    <Button onClick={handleProcess}>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === "scanning" && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-48 h-48 bg-black mx-auto rounded-lg flex items-center justify-center text-white">
                    [Camera Feed Mockup]
                  </div>
                  <Button variant="ghost" onClick={() => setStep("input")}>Cancel</Button>
                  <Button onClick={handleProcess}>Process Scanned QR</Button>
                </div>
              )}

              {step === "processing" && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
                  <p className="font-medium">Verifying Signature...</p>
                  <p className="text-sm text-muted-foreground">Checking issuer DID and blockchain validity.</p>
                </div>
              )}

              {step === "success" && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg">Credential Added!</h3>
                  <p className="text-muted-foreground text-sm mb-6">The credential has been verified and added to your wallet.</p>
                  <Button className="w-full" asChild>
                    <a href="/">View Wallet</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
