import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  QrCode,
  Download,
  Link as LinkIcon,
  EyeOff,
  ShieldCheck,
  Building2,
  CheckCircle2,
  ArrowLeft,
  Share2,
  FileText,
  Clock,
  Eye,
  Loader2,
  Copy,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { ShareModal } from "@/components/share-modal";
import { useQuery } from "@tanstack/react-query";

interface CredentialData {
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  data: any;
  category: string;
  anchorStatus: string;
  anchorTxHash?: string;
  blockNumber?: number;
  hash: string;
  verificationCount: number;
}

interface ShareRecord {
  id: string;
  shareType: string;
  disclosedFields: string[];
  expiry: string;
  createdAt: string;
  accessLog: { timestamp: string; ip: string }[];
  revoked: boolean;
}

interface ConsentLog {
  id: string;
  action: string;
  disclosedFields: string[];
  recipientName?: string;
  purpose: string;
  timestamp: string;
}

export default function CredentialDetail() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/credential/:id");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch credential details
  const { data, isLoading, error } = useQuery({
    queryKey: [`wallet-credential-${params?.id}`],
    queryFn: async () => {
      const res = await fetch(`/api/wallet/credentials/${params?.id}?userId=1`);
      if (!res.ok) throw new Error("Failed to fetch credential");
      return res.json();
    },
    enabled: !!params?.id,
  });

  const credential: CredentialData | undefined = data?.credential;
  const shares: ShareRecord[] = data?.shares || [];
  const consentLogs: ConsentLog[] = data?.consentLogs || [];

  const handleCopyHash = () => {
    if (credential?.hash) {
      navigator.clipboard.writeText(credential.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 md:ml-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !credential) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 md:ml-64 flex flex-col items-center justify-center gap-4">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
          <p className="text-muted-foreground">Credential not found</p>
          <Button onClick={() => setLocation("/")}>Go Back</Button>
        </div>
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      academic: "from-blue-600 to-blue-800",
      employment: "from-purple-600 to-purple-800",
      skill: "from-green-600 to-green-800",
      government: "from-red-600 to-red-800",
    };
    return colors[category] || "from-gray-600 to-gray-800";
  };

  const actions = [
    {
      icon: QrCode,
      label: "Generate QR",
      desc: "For in-person verification",
      onClick: () => setShareModalOpen(true),
    },
    {
      icon: Download,
      label: "Download PDF",
      desc: "Signed official copy",
      onClick: () => alert("PDF download coming soon"),
    },
    {
      icon: LinkIcon,
      label: "Share Link",
      desc: "Time-limited URL",
      onClick: () => setShareModalOpen(true),
    },
    {
      icon: EyeOff,
      label: "Selective Disclosure",
      desc: "Hide sensitive fields",
      onClick: () => setShareModalOpen(true),
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-y-auto bg-secondary/30">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg">Credential Details</h1>
          <Badge variant="outline" className="ml-auto capitalize">
            {credential.category}
          </Badge>
        </div>

        <main className="p-6 max-w-3xl mx-auto w-full space-y-8 pb-24">
          {/* Credential Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-gradient-to-br ${getCategoryColor(credential.category)} rounded-2xl p-8 text-white shadow-xl relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />

            <div className="absolute top-6 right-6">
              <Badge
                className={`${credential.anchorStatus === "anchored" ? "bg-green-500/20 text-green-100" : "bg-amber-500/20 text-amber-100"} border-none`}
              >
                {credential.anchorStatus === "anchored"
                  ? "⛓ Blockchain Verified"
                  : "⏳ Pending Anchor"}
              </Badge>
            </div>

            <div className="relative z-10 space-y-6">
              <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                <Building2 className="w-8 h-8" />
              </div>

              <div>
                <p className="text-white/70 text-sm uppercase tracking-wider mb-2">
                  {credential.issuer}
                </p>
                <h1 className="text-3xl font-bold">
                  {credential.data?.name || credential.type[1] || "Credential"}
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/20">
                <div>
                  <p className="text-white/60 text-xs uppercase">Recipient</p>
                  <p className="text-lg font-semibold">
                    {typeof credential.data?.recipient === "object"
                      ? credential.data?.recipient?.name
                      : credential.data?.recipient || "John Doe"}
                  </p>
                </div>
                <div>
                  <p className="text-white/60 text-xs uppercase">Issued On</p>
                  <p className="text-lg font-semibold">
                    {new Date(credential.issuanceDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {actions.map((action, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                onClick={action.onClick}
                className="flex flex-col items-center justify-center p-4 bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/50 hover:-translate-y-1 transition-all duration-200 group text-center h-full"
              >
                <div className="w-10 h-10 rounded-full bg-secondary text-foreground flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{action.label}</span>
                <span className="text-[10px] text-muted-foreground mt-1">
                  {action.desc}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Credential Data */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Trust Chain */}
            <Card className="border-border">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-600" /> Trust Chain
                </h3>

                <div className="relative pl-4 border-l-2 border-border space-y-6">
                  <div className="relative">
                    <div
                      className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ring-4 ring-card ${credential.anchorStatus === "anchored" ? "bg-green-500" : "bg-amber-500"}`}
                    />
                    <p className="text-sm font-medium">Blockchain Anchor</p>
                    {credential.anchorTxHash ? (
                      <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                        TX: {credential.anchorTxHash.slice(0, 20)}...
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 mt-1">
                        Pending confirmation
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-green-500 ring-4 ring-card" />
                    <p className="text-sm font-medium">Signed by Issuer</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {credential.issuer}
                    </p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-green-500 ring-4 ring-card" />
                    <p className="text-sm font-medium">Stored in Wallet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      AES-256 Encrypted
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card className="border-border">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Metadata
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Credential ID</span>
                    <span className="font-mono text-xs truncate max-w-[150px]">
                      {credential.id}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Schema Type</span>
                    <span className="capitalize">
                      {credential.type[1] || credential.type[0]}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Hash</span>
                    <button
                      onClick={handleCopyHash}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <span className="font-mono text-xs">
                        {credential.hash.slice(0, 12)}...
                      </span>
                      {copied ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Verifications</span>
                    <span>{credential.verificationCount}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Credential Fields */}
          <Card className="border-border">
            <CardContent className="p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-primary" /> Credential Data
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(credential.data || {})
                  .filter(([key]) => key !== "recipient")
                  .map(([key, value]) => (
                    <div key={key} className="p-3 bg-secondary/50 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase mb-1">
                        {key.replace(/_/g, " ")}
                      </p>
                      <p className="font-medium">
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value)}
                      </p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Share History */}
          {shares.length > 0 && (
            <Card className="border-border">
              <CardContent className="p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <Share2 className="w-4 h-4 text-primary" /> Share History (
                  {shares.length})
                </h3>
                <div className="space-y-3">
                  {shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border"
                    >
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {share.shareType} Share
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {share.disclosedFields.length} fields •{" "}
                          {share.accessLog.length} views
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            share.revoked
                              ? "destructive"
                              : new Date(share.expiry) < new Date()
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {share.revoked
                            ? "Revoked"
                            : new Date(share.expiry) < new Date()
                              ? "Expired"
                              : "Active"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(share.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Consent Logs */}
          {consentLogs.length > 0 && (
            <Card className="border-border">
              <CardContent className="p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-primary" /> Consent Audit Trail
                </h3>
                <div className="space-y-2">
                  {consentLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 p-2 text-sm"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${log.action === "share" ? "bg-blue-500" : log.action === "revoke" ? "bg-red-500" : "bg-green-500"}`}
                      />
                      <span className="capitalize">{log.action}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {log.disclosedFields.length} fields
                      </span>
                      <span className="text-muted-foreground ml-auto text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      <ShareModal
        credential={credential as any}
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
      />
    </div>
  );
}
