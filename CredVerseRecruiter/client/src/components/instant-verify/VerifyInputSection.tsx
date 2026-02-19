import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QrCode, FileText, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VerifyInputSectionProps {
  jwtInput: string;
  setJwtInput: (val: string) => void;
  linkInput: string;
  setLinkInput: (val: string) => void;
  onVerifyJwt: () => void;
  onVerifyLink: () => void;
  isVerifyingJwt: boolean;
  isVerifyingLink: boolean;
}

export function VerifyInputSection({
  jwtInput,
  setJwtInput,
  linkInput,
  setLinkInput,
  onVerifyJwt,
  onVerifyLink,
  isVerifyingJwt,
  isVerifyingLink,
}: VerifyInputSectionProps) {
  const { toast } = useToast();

  return (
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
              <Label>VC-JWT Token</Label>
              <Textarea
                placeholder="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
                className="min-h-[150px] font-mono text-xs"
                value={jwtInput}
                onChange={(e) => setJwtInput(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={onVerifyJwt} disabled={!jwtInput.trim() || isVerifyingJwt}>
              {isVerifyingJwt ? "Verifying..." : "Verify JWT"}
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
            <Button className="w-full" onClick={onVerifyLink} disabled={!linkInput.trim() || isVerifyingLink}>
              {isVerifyingLink ? "Verifying..." : "Verify Link"}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
