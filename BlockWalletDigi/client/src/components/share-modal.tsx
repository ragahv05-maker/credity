import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  QrCode,
  Link as LinkIcon,
  Check,
  Share2,
  Clock,
  Mail,
  MessageCircle,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { Credential } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { useBiometrics } from "@/hooks/use-biometrics";

interface ShareModalProps {
  credential: Credential | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShareResult {
  shareUrl: string;
  shareId: string;
  qrData?: string;
  expiry: string;
}

interface FieldsData {
  fields?: string[];
}

export function ShareModal({
  credential,
  open,
  onOpenChange,
}: ShareModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [expiryMinutes, setExpiryMinutes] = useState<string>("30");
  const [shareType, setShareType] = useState<string>("link");
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Get available fields for selective disclosure
  const { data: fieldsData } = useQuery<FieldsData>({
    queryKey: [`/api/wallet/credentials/${credential?.id}/fields`],
    enabled: !!credential?.id && open,
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setShareResult(null);
      setQrCodeUrl(null);
      setSelectedFields([]);
    }
  }, [open]);

  // Biometrics hook
  const { verifyBiometrics } = useBiometrics();

  const handleShareClick = async () => {
    try {
      // PROMPT BIOMETRIC AUTH
      const verification = await verifyBiometrics("1");
      if (!verification.success) {
        toast({
          title: "Authentication Failed",
          description: "Biometric verification required to share credentials",
          variant: "destructive",
        });
        return;
      }

      shareMutation.mutate();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Could not verify biometrics",
        variant: "destructive",
      });
    }
  };

  // Create share mutation
  const shareMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/wallet/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: 1,
          credentialId: credential?.id,
          shareType,
          disclosedFields: selectedFields,
          expiryMinutes: parseInt(expiryMinutes),
          purpose: "verification",
        }),
      });
      if (!response.ok) throw new Error("Failed to create share");
      return response.json();
    },
    onSuccess: async (data) => {
      setShareResult({
        shareUrl: data.shareUrl,
        shareId: data.share.id,
        qrData: data.qrData,
        expiry: data.share.expiry,
      });

      // Generate QR code
      if (data.shareUrl) {
        const qrUrl = await QRCode.toDataURL(data.shareUrl, {
          width: 256,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
        setQrCodeUrl(qrUrl);
      }

      toast({
        title: "Share Created",
        description: `Expires in ${expiryMinutes} minutes`,
      });
    },
    onError: () => {
      toast({ title: "Failed to create share", variant: "destructive" });
    },
  });

  if (!credential) return null;

  const handleCopy = () => {
    if (shareResult?.shareUrl) {
      navigator.clipboard.writeText(shareResult.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async (type: "email" | "whatsapp" | "native") => {
    if (!shareResult?.shareUrl) return;

    const title = `Credential Verification: ${(credential.data as any)?.name || "Credential"}`;
    const text = `Verify my ${credential.issuer} credential: ${shareResult.shareUrl}`;

    if (type === "email") {
      window.open(
        `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`,
      );
    } else if (type === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    } else if (type === "native" && navigator.share) {
      await navigator.share({ title, text, url: shareResult.shareUrl });
    }
  };

  const availableFields =
    fieldsData?.fields || Object.keys(credential.data || {});
  const expiryOptions = [
    { value: "1", label: "1 minute" },
    { value: "5", label: "5 minutes" },
    { value: "30", label: "30 minutes" },
    { value: "60", label: "1 hour" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Share Credential Securely
          </DialogTitle>
          <DialogDescription>
            Create a verifiable, time-limited share with selective disclosure.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="disclosure" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="disclosure">Selective Disclosure</TabsTrigger>
            <TabsTrigger value="share" disabled={!shareResult}>
              Share Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="disclosure" className="space-y-4">
            {/* Expiry Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> Link Expiry
              </Label>
              <Select value={expiryMinutes} onValueChange={setExpiryMinutes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {expiryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Share Type */}
            <div className="space-y-2">
              <Label>Share Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "link", icon: LinkIcon, label: "Link" },
                  { value: "qr", icon: QrCode, label: "QR Code" },
                  { value: "email", icon: Mail, label: "Email" },
                ].map((type) => (
                  <Button
                    key={type.value}
                    variant={shareType === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShareType(type.value)}
                    className="flex flex-col h-auto py-3 gap-1"
                  >
                    <type.icon className="w-4 h-4" />
                    <span className="text-xs">{type.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Field Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Fields to Reveal
                </Label>
                <Badge variant="secondary" className="text-xs">
                  {selectedFields.length === 0
                    ? "All fields"
                    : `${selectedFields.length} selected`}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Unselected fields will be cryptographically hidden (SD-JWT).
              </p>
              <div className="space-y-2 border rounded-lg p-3 max-h-48 overflow-y-auto bg-secondary/20">
                {/* Required fields */}
                <div className="flex items-center space-x-2 opacity-60">
                  <Checkbox id="f-issuer" checked disabled />
                  <Label htmlFor="f-issuer" className="flex-1 text-sm">
                    Issuer
                  </Label>
                  <Badge variant="outline" className="text-[10px]">
                    Required
                  </Badge>
                </div>

                {/* Dynamic fields */}
                {availableFields.map((field: string) => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      id={`f-${field}`}
                      checked={
                        selectedFields.includes(field) ||
                        selectedFields.length === 0
                      }
                      onCheckedChange={(checked) => {
                        let currentSelection = selectedFields;
                        // If currently empty (meaning "All"), use all available fields as base
                        if (currentSelection.length === 0) {
                          currentSelection = availableFields;
                        }

                        if (checked) {
                          setSelectedFields([...currentSelection, field]);
                        } else {
                          const newSelection = currentSelection.filter(
                            (f) => f !== field,
                          );
                          setSelectedFields(newSelection);
                        }
                      }}
                    />
                    <Label
                      htmlFor={`f-${field}`}
                      className="flex-1 text-sm capitalize"
                    >
                      {field.replace(/_/g, " ").replace(/([A-Z])/g, " $1")}
                    </Label>
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {String((credential.data as any)?.[field] || "").slice(
                        0,
                        20,
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleShareClick}
              disabled={shareMutation.isPending}
            >
              {shareMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Share...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Generate Secure Share
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="share" className="space-y-4">
            {shareResult && (
              <>
                {/* QR Code Display */}
                <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-white">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  ) : (
                    <QrCode className="w-32 h-32 text-gray-400" />
                  )}
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Scan to verify credential via W3C VC standard
                  </p>
                  <Badge className="mt-2 text-xs" variant="outline">
                    <Clock className="w-3 h-3 mr-1" />
                    Expires in {expiryMinutes} min
                  </Badge>
                </div>

                {/* Link Copy */}
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareResult.shareUrl}
                    className="font-mono text-xs bg-secondary/30"
                  />
                  <Button size="icon" variant="outline" onClick={handleCopy}>
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Share Options */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare("email")}
                  >
                    <Mail className="w-4 h-4 mr-2" /> Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare("whatsapp")}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare("native")}
                  >
                    <Share2 className="w-4 h-4 mr-2" /> More
                  </Button>
                </div>

                {/* Open Link */}
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => window.open(shareResult.shareUrl, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Verification Page
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
