import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    Camera,
    CheckCircle2,
    XCircle,
    Loader2,
    Eye,
    Smile,
    MoveLeft,
    MoveRight,
    ArrowDown,
    Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFaceDetection } from "@/hooks/use-face-detection";
import { ScannerOverlay } from "./scanner-overlay";
import { Challenge } from "./types";

export const LivenessTab = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Real face detection hook
    const {
        videoRef,
        canvasRef,
        isActive: cameraActive,
        faceDetected,
        startCamera,
        stopCamera,
        startDetection,
        stopDetection,
        takeSnapshot
    } = useFaceDetection();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [livenessSession, setLivenessSession] = useState<any>(null);
    const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
    const [challengeTimer, setChallengeTimer] = useState(5);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [livenessProgress, setLivenessProgress] = useState(0);
    const [pendingCameraStart, setPendingCameraStart] = useState(false);

    // Complete challenge mutation
    const completeChallengesMutation = useMutation({
        mutationFn: async ({ sessionId, challengeId }: { sessionId: string; challengeId: string }) => {
            const res = await fetch('/api/identity/liveness/challenge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, challengeId })
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.sessionComplete) {
                toast({ title: 'Liveness Verified!', description: 'Your face has been verified successfully.' });
                stopCamera();
                setLivenessSession(null);
                setCurrentChallenge(null);
                queryClient.invalidateQueries({ queryKey: ['identity-status'] });
            } else if (data.nextChallenge) {
                setCurrentChallenge(data.nextChallenge);
                setChallengeTimer(5);
            }
        }
    });

    const completeLiveness = useCallback(async (frameData?: string | null) => {
        try {
            const res = await fetch('/api/identity/liveness/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: '1',
                    passed: true,
                    frameData: frameData || undefined
                })
            });
            const data = await res.json();

            if (data.success) {
                toast({
                    title: 'Liveness Verified!',
                    description: data.aiAnalysis ? 'AI confirmed identity and liveness.' : 'Your face has been verified as a real person.'
                });

                setLivenessSession(null);
                setCurrentChallenge(null);
                setLivenessProgress(0);
                queryClient.invalidateQueries({ queryKey: ['identity-status'] });
            } else {
                throw new Error(data.details || data.error);
            }
        } catch (error: unknown) {
             const errorMessage = error instanceof Error ? error.message : 'Could not complete liveness verification';
            toast({
                title: 'Verification Failed',
                description: errorMessage,
                variant: 'destructive'
            });
        }
    }, [queryClient, toast]); // Added stopCamera just in case, though it comes from hook

    // Start real liveness check with camera
    const handleStartLiveness = async () => {
        // First, set the session to render the video element
        setLivenessSession({ active: true, pending: true });
        setCurrentChallenge({
            id: 'face_motion',
            type: 'motion',
            instruction: 'Move your head slowly left and right',
            timeoutMs: 30000
        });
        setPendingCameraStart(true);
    };

    // Effect to start camera after video element is rendered
    useEffect(() => {
        if (!pendingCameraStart || !livenessSession) return;

        const initCamera = async () => {
            // Small delay to ensure video element is mounted
            await new Promise(resolve => setTimeout(resolve, 100));

            const started = await startCamera();
            if (!started) {
                toast({
                    title: 'Camera Error',
                    description: 'Could not access camera. Please allow camera permissions.',
                    variant: 'destructive'
                });
                setLivenessSession(null);
                setCurrentChallenge(null);
                setPendingCameraStart(false);
                return;
            }

            setPendingCameraStart(false);
            setLivenessSession({ active: true });

            // Start face detection
            let motionCount = 0;
            startDetection((result) => {
                if (result.faceDetected && result.motion) {
                    motionCount++;
                    const progress = Math.min((motionCount / 10) * 100, 100);
                    setLivenessProgress(progress);

                    if (motionCount >= 10) {
                        // Capture snapshot for AI analysis
                        const snapshot = takeSnapshot();

                        // Complete liveness
                        stopDetection();
                        stopCamera();
                        completeLiveness(snapshot);
                    }
                }
            });
        };

        initCamera();
    }, [pendingCameraStart, livenessSession, startCamera, startDetection, stopDetection, stopCamera, takeSnapshot, toast, completeLiveness]);

    // Challenge timer
    useEffect(() => {
        if (currentChallenge && challengeTimer > 0) {
            const timer = setTimeout(() => setChallengeTimer(t => t - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [currentChallenge, challengeTimer]);

    // Get challenge icon
    const getChallengeIcon = (type: string) => {
        switch (type) {
            case 'blink': return <Eye className="w-12 h-12" />;
            case 'smile': return <Smile className="w-12 h-12" />;
            case 'turn_left': return <MoveLeft className="w-12 h-12" />;
            case 'turn_right': return <MoveRight className="w-12 h-12" />;
            case 'nod': return <ArrowDown className="w-12 h-12" />;
            default: return <Camera className="w-12 h-12" />;
        }
    };

    return (
        <motion.div
            key="liveness"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
        >
            <div className="bg-card p-6 rounded-xl border">
                <h3 className="font-semibold mb-4">Liveness Verification</h3>

                {!livenessSession ? (
                    <div className="text-center py-8">
                        <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h4 className="font-medium mb-2">Face Verification</h4>
                        <p className="text-sm text-muted-foreground mb-6">
                            You'll be asked to perform 3 simple actions to verify you're a real person
                        </p>
                        <Button
                            onClick={handleStartLiveness}
                            disabled={cameraActive}
                        >
                            {cameraActive ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Camera className="w-4 h-4 mr-2" />
                            )}
                            Start Verification
                        </Button>
                    </div>
                ) : (
                    <div className="relative space-y-4">
                        {/* Immersive Camera Frame */}
                        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl border border-border/50 ring-1 ring-white/10">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover scale-x-[-1]" // Mirror effect
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Futuristic Overlay */}
                            <ScannerOverlay
                                active={true}
                                status={
                                    faceDetected ? "FACE DETECTED - ANALYZING..." : "SEARCHING FOR SUBJECT..."
                                }
                            />

                            {/* Challenge Overlay */}
                            <AnimatePresence>
                                {currentChallenge && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.1 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] text-white"
                                    >
                                        <div className="relative">
                                            {/* Glowing Ring */}
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                                className="absolute inset-0 rounded-full border-2 border-dashed border-white/30"
                                            />
                                            <div className="bg-background/20 p-8 rounded-full backdrop-blur-md border border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                                                <div className="text-6xl text-white drop-shadow-md">
                                                    {getChallengeIcon(currentChallenge.type)}
                                                </div>
                                            </div>
                                        </div>

                                        <motion.p
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            className="text-2xl font-bold mt-8 mb-2 tracking-tight text-center max-w-md drop-shadow-lg"
                                        >
                                            {currentChallenge.instruction}
                                        </motion.p>

                                        <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-lg font-mono font-bold">{challengeTimer}s</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Progress Indicators */}
                        <div className="grid grid-cols-3 gap-3 px-4">
                            {livenessSession.challenges?.map((c: Challenge, i: number) => {
                                const isCompleted = i < (livenessSession.challenges?.findIndex((ch: Challenge) => ch.id === currentChallenge?.id) || 0);
                                const isCurrent = c.id === currentChallenge?.id;

                                return (
                                    <div
                                        key={c.id}
                                        className={`h-1.5 rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                                            isCurrent ? 'bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]' :
                                                'bg-secondary'
                                            }`}
                                    />
                                );
                            })}
                        </div>

                        {/* Controls */}
                        <div className="flex gap-4 pt-2">
                            <Button
                                className="flex-1 h-12 text-base shadow-lg hover:shadow-primary/25"
                                onClick={() => {
                                    if (livenessSession && currentChallenge) {
                                        completeChallengesMutation.mutate({
                                            sessionId: livenessSession.sessionId,
                                            challengeId: currentChallenge.id
                                        });
                                    }
                                }}
                                disabled={completeChallengesMutation.isPending}
                            >
                                {completeChallengesMutation.isPending ? (
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                ) : <CheckCircle2 className="w-5 h-5 mr-2" />}
                                I Completed This Action
                            </Button>

                            <Button
                                variant="secondary"
                                className="h-12 w-12 p-0 rounded-xl"
                                onClick={() => {
                                    stopCamera();
                                    setLivenessSession(null);
                                    setCurrentChallenge(null);
                                }}
                            >
                                <XCircle className="w-5 h-5 text-muted-foreground" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
