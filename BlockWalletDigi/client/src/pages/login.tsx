import { useState } from "react";
import { motion } from "framer-motion";
import { Fingerprint, ScanFace, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function LoginPage() {
  const [_, setLocation] = useLocation();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleBiometricLogin = () => {
    setIsAuthenticating(true);
    setTimeout(() => {
      setLocation("/");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter">Welcome Back</h1>
          <p className="text-muted-foreground">
            Authenticate to access your secure wallet.
          </p>
        </div>

        <motion.div
          className="py-12 flex justify-center"
          animate={
            isAuthenticating ? { scale: [1, 1.1, 1], opacity: [1, 0.5, 1] } : {}
          }
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <Button
              variant="outline"
              className="w-24 h-24 rounded-full border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
              onClick={handleBiometricLogin}
            >
              <ScanFace className="w-10 h-10 text-primary" />
            </Button>
          </div>
        </motion.div>

        <div className="space-y-4">
          <Button
            className="w-full h-12 text-lg"
            onClick={handleBiometricLogin}
          >
            <Fingerprint className="mr-2 h-5 w-5" />
            Unlock with Biometrics
          </Button>
          <p className="text-xs text-muted-foreground">
            Secured by Secure Enclave & Zero-Knowledge Proofs
          </p>
        </div>
      </div>
    </div>
  );
}
