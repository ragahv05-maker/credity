import { useState, useRef, useEffect } from "react";
import {
  Camera,
  X,
  SwitchCamera,
  FlashlightOff,
  Flashlight,
  CheckCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "@/hooks/use-toast";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

/**
 * QR Code Scanner Component
 * Uses html5-qrcode or native camera API
 */
export function QRScanner({
  onScan,
  onClose,
  title = "Scan QR Code",
  description,
}: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const [flash, setFlash] = useState(false);
  const [scanned, setScanned] = useState(false);
  const { toast } = useToast();
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      setError(null);
      setScanning(true);

      // Stop previous stream
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Start scanning
      startScanning();
    } catch (err: any) {
      console.error("[QRScanner] Camera error:", err);
      setError("Unable to access camera. Please check permissions.");
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startScanning = () => {
    // Simple QR detection using canvas
    // In production, use html5-qrcode library for better detection
    intervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current && !scanned) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // In a real implementation, use jsQR or html5-qrcode here
          // For demo, we'll simulate scanning after 3 seconds
        }
      }
    }, 100);
  };

  const handleManualInput = () => {
    const input = prompt("Enter credential URL or token manually:");
    if (input) {
      handleScan(input);
    }
  };

  const handleScan = (data: string) => {
    setScanned(true);
    stopCamera();

    toast({
      title: "QR Code Scanned",
      description: "Processing credential...",
      className: "bg-emerald-900/90 border-emerald-500/20 text-white",
    });

    onScan(data);
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const toggleFlash = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;

      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !flash } as any],
        });
        setFlash(!flash);
      } else {
        toast({
          title: "Flash not available",
          description: "Your device doesn't support flashlight",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>{title}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}

          {error ? (
            <div className="aspect-video bg-red-500/10 border border-red-500/20 rounded-lg flex flex-col items-center justify-center p-6 text-center">
              <Camera className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-400">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={startCamera}
              >
                Try Again
              </Button>
            </div>
          ) : scanned ? (
            <div className="aspect-video bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex flex-col items-center justify-center p-6">
              <CheckCircle className="h-12 w-12 text-emerald-500 mb-4" />
              <p className="text-emerald-400">QR Code Scanned Successfully!</p>
            </div>
          ) : (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />

              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />

                  {/* Scanning line animation */}
                  <div className="absolute inset-x-4 h-0.5 bg-primary animate-scan" />
                </div>
              </div>

              {/* Controls */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={toggleCamera}
                  className="bg-black/50 hover:bg-black/70"
                  aria-label="Switch camera"
                >
                  <SwitchCamera className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={toggleFlash}
                  className="bg-black/50 hover:bg-black/70"
                  aria-label={flash ? "Turn off flash" : "Turn on flash"}
                >
                  {flash ? (
                    <Flashlight className="h-5 w-5" />
                  ) : (
                    <FlashlightOff className="h-5 w-5" />
                  )}
                </Button>
              </div>

              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleManualInput}
            >
              Enter Manually
            </Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 4px; }
          50% { top: calc(100% - 4px); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

/**
 * Button to open QR scanner
 */
export function ScanQRButton({
  onScan,
  className,
}: {
  onScan: (data: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className={className}
        aria-label="Scan QR code to receive credential"
      >
        <Camera className="h-4 w-4 mr-2" />
        Scan QR
      </Button>

      {isOpen && (
        <QRScanner
          onScan={(data) => {
            setIsOpen(false);
            onScan(data);
          }}
          onClose={() => setIsOpen(false)}
          title="Receive Credential"
          description="Scan a QR code from an issuer to import a credential into your wallet."
        />
      )}
    </>
  );
}

export default QRScanner;
