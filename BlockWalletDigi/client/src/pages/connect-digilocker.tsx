import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Loader2,
  Shield,
  AlertCircle,
  FileText,
  Download,
  ExternalLink,
  Fingerprint,
  CreditCard,
  Car,
  GraduationCap,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface DigiLockerDocument {
  uri: string;
  doctype: string;
  name: string;
  description: string;
  issuer: string;
  date: string;
}

const docTypeIcons: Record<string, any> = {
  ADHAR: Fingerprint,
  PAN: CreditCard,
  DRVLC: Car,
  CLASS10: GraduationCap,
  CLASS12: GraduationCap,
  DEGREE: GraduationCap,
};

export default function ConnectDigiLocker() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [importing, setImporting] = useState<string | null>(null);

  // Check URL params for callback result
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected === "true") {
      toast({
        title: "DigiLocker Connected!",
        description: "Your account is now linked. You can import documents.",
        className: "bg-emerald-900/90 border-emerald-500/20 text-white",
      });
      queryClient.invalidateQueries({ queryKey: ["digilocker-status"] });
    }

    if (error) {
      toast({
        title: "Connection Failed",
        description: error,
        variant: "destructive",
      });
    }
  }, [searchParams]);

  // Check connection status
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["digilocker-status"],
    queryFn: async () => {
      const res = await fetch("/api/digilocker/status?userId=1");
      return res.json();
    },
  });

  // Get available documents
  const { data: documentsData, isLoading: docsLoading } = useQuery({
    queryKey: ["digilocker-documents"],
    queryFn: async () => {
      const res = await fetch("/api/digilocker/documents?userId=1");
      return res.json();
    },
    enabled: statusData?.connected,
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/digilocker/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: 1 }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.requiresAuth) {
        // Redirect to DigiLocker OAuth
        window.location.href = data.authUrl;
      } else if (data.success) {
        toast({
          title: "DigiLocker Connected!",
          description: `${data.documentsImported} documents imported.`,
          className: "bg-emerald-900/90 border-emerald-500/20 text-white",
        });
        queryClient.invalidateQueries({ queryKey: ["digilocker-status"] });
        queryClient.invalidateQueries({ queryKey: ["digilocker-documents"] });
        queryClient.invalidateQueries({ queryKey: ["wallet-credentials"] });
      }
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Could not connect to DigiLocker.",
        variant: "destructive",
      });
    },
  });

  // Import single document
  const importMutation = useMutation({
    mutationFn: async (doc: DigiLockerDocument) => {
      setImporting(doc.uri);
      const res = await fetch("/api/digilocker/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: 1,
          documentUri: doc.uri,
          documentType: doc.doctype,
          documentName: doc.name,
          issuer: doc.issuer,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Document Imported!",
        description: data.message,
        className: "bg-emerald-900/90 border-emerald-500/20 text-white",
      });
      queryClient.invalidateQueries({ queryKey: ["wallet-credentials"] });
      setImporting(null);
    },
    onError: () => {
      toast({
        title: "Import Failed",
        description: "Could not import document.",
        variant: "destructive",
      });
      setImporting(null);
    },
  });

  // Import all documents
  const importAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/digilocker/import-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: 1 }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "All Documents Imported!",
        description: `Imported ${data.imported.length} of ${data.total} documents.`,
        className: "bg-emerald-900/90 border-emerald-500/20 text-white",
      });
      queryClient.invalidateQueries({ queryKey: ["wallet-credentials"] });
    },
  });

  // Disconnect
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/digilocker/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: 1 }),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Disconnected from DigiLocker" });
      queryClient.invalidateQueries({ queryKey: ["digilocker-status"] });
    },
  });

  const isConnected = statusData?.connected;
  const documents: DigiLockerDocument[] = documentsData?.documents || [];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 md:ml-64 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-xl shadow-blue-900/30">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold">DigiLocker Integration</h1>
            <p className="text-muted-foreground">
              Import your government-issued documents securely to your wallet.
            </p>
            {statusData?.isDemoMode && (
              <Badge
                variant="outline"
                className="text-amber-500 border-amber-500/30"
              >
                Demo Mode
              </Badge>
            )}
          </div>

          {/* Status Card */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Connection Status</span>
                {isConnected ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not Connected</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : isConnected ? (
                <div className="space-y-4">
                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <p className="font-medium">
                      {statusData.user?.name || "User"}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">
                      ID: {statusData.user?.digilockerid}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        queryClient.invalidateQueries({
                          queryKey: ["digilocker-documents"],
                        })
                      }
                    >
                      <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-400"
                      onClick={() => disconnectMutation.mutate()}
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="font-medium">Verified Identity</p>
                        <p className="text-sm text-muted-foreground">
                          Access Aadhaar, PAN, and Driving License
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="font-medium">Blockchain Backed</p>
                        <p className="text-sm text-muted-foreground">
                          Documents are hashed and verified on-chain
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full h-12 bg-[#2B6CB0] hover:bg-[#2C5282]"
                    onClick={() => connectMutation.mutate()}
                    disabled={connectMutation.isPending}
                  >
                    {connectMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Shield className="w-5 h-5 mr-2" />
                    )}
                    Connect with DigiLocker
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By connecting, you agree to our Terms of Service and Privacy
                    Policy.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents List */}
          {isConnected && (
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Available Documents ({documents.length})
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => importAllMutation.mutate()}
                    disabled={
                      importAllMutation.isPending || documents.length === 0
                    }
                  >
                    {importAllMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Import All
                  </Button>
                </div>
                <CardDescription>
                  Select documents to import into your wallet
                </CardDescription>
              </CardHeader>
              <CardContent>
                {docsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No documents found in your DigiLocker account.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => {
                      const Icon = docTypeIcons[doc.doctype] || FileText;
                      const isImporting = importing === doc.uri;

                      return (
                        <motion.div
                          key={doc.uri}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-4 p-4 border rounded-lg hover:border-primary/50 transition-colors"
                        >
                          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <Icon className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{doc.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {doc.issuer} • {doc.date}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => importMutation.mutate(doc)}
                            disabled={isImporting}
                          >
                            {isImporting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-1" /> Import
                              </>
                            )}
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">
                    About DigiLocker
                  </p>
                  <p>
                    DigiLocker is the Government of India's official platform
                    for storing and accessing documents digitally. Documents
                    imported from DigiLocker are legally valid and
                    cryptographically signed.
                  </p>
                  <a
                    href="https://digilocker.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:underline mt-2"
                  >
                    Learn more <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
