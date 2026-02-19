import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    ShieldCheck,
    Fingerprint,
    Smartphone,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useBiometrics } from "@/hooks/use-biometrics";
import { VerificationStatus } from "./types";

interface BiometricsTabProps {
    status: VerificationStatus | undefined;
}

export const BiometricsTab = ({ status }: BiometricsTabProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [biometricAvailable, setBiometricAvailable] = useState<{ available: boolean; platformAuthenticator: boolean } | null>(null);

    // Real biometrics hook (WebAuthn)
    const {
        isEnrolling,
        enrollBiometrics: enrollWithWebAuthn,
        checkAvailability
    } = useBiometrics();

    // Check biometric availability on mount
    useEffect(() => {
        checkAvailability().then(setBiometricAvailable);
    }, [checkAvailability]);

    // Enroll biometrics with real WebAuthn
    const handleBiometricEnroll = async (type: 'face_id' | 'fingerprint') => {
        try {
            toast({ title: 'Requesting Biometric...', description: 'Please authenticate with your device' });

            const result = await enrollWithWebAuthn('1', type);

            if (result.success) {
                toast({
                    title: 'Biometrics Enrolled!',
                    description: 'Your device biometrics are now linked to your identity.'
                });
                queryClient.invalidateQueries({ queryKey: ['identity-status'] });
            } else {
                toast({
                    title: 'Enrollment Failed',
                    description: result.error || 'Could not complete biometric enrollment',
                    variant: 'destructive'
                });
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Biometric authentication failed';
            toast({
                title: 'Biometric Error',
                description: errorMessage,
                variant: 'destructive'
            });
        }
    };

    return (
        <motion.div
            key="biometrics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
        >
            <div className="glass-card p-8 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    Secure Enclave Biometrics
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Face ID */}
                    <div className="group relative p-6 rounded-xl border bg-card/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg cursor-pointer overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Smartphone className="w-6 h-6 text-blue-500" />
                            </div>
                            <h4 className="font-semibold mb-1">Face Recognition</h4>
                            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                                Securely authenticate using hardware-backed facial recognition.
                            </p>
                            <Button
                                className="w-full"
                                variant={status?.biometrics?.type === 'face_id' ? "secondary" : "default"}
                                onClick={() => handleBiometricEnroll('face_id')}
                                disabled={isEnrolling || status?.biometrics?.enrolled}
                            >
                                {isEnrolling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {status?.biometrics?.type === 'face_id' ? 'Device Paired ✓' : 'Enable Face ID'}
                            </Button>
                        </div>
                    </div>

                    {/* Fingerprint */}
                    <div className="group relative p-6 rounded-xl border bg-card/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg cursor-pointer overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Fingerprint className="w-6 h-6 text-green-500" />
                            </div>
                            <h4 className="font-semibold mb-1">Touch ID</h4>
                            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                                Use your fingerprint sensor for instant, high-security access.
                            </p>
                            <Button
                                className="w-full"
                                variant={status?.biometrics?.type === 'fingerprint' ? "secondary" : "default"}
                                onClick={() => handleBiometricEnroll('fingerprint')}
                                disabled={isEnrolling || status?.biometrics?.enrolled}
                            >
                                {isEnrolling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {status?.biometrics?.type === 'fingerprint' ? 'Device Paired ✓' : 'Enable Touch ID'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
