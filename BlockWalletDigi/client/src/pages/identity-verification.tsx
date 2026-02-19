/**
 * Identity Verification Page
 * Implements PRD v3.1 Layer 1: Identity Verification UI
 * 
 * Features:
 * - Liveness Detection (camera challenges)
 * - Biometric Setup (Face ID / Fingerprint)
 * - Document Scanning (upload & OCR)
 * - Verification Status Dashboard
 */

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Camera,
    CheckCircle2,
    XCircle,
    ShieldCheck,
    Fingerprint,
    ScanLine,
    Upload,
    Loader2,
    AlertTriangle,
    ChevronRight,
    Eye,
    Smile,
    MoveLeft,
    MoveRight,
    ArrowDown,
    FileText,
    Smartphone,
    CircleDot,
    AlertCircle,
    Clock,
    Zap,
    Shield,
    EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBiometrics } from "@/hooks/use-biometrics";
import { useFaceDetection } from "@/hooks/use-face-detection";

// Futuristic Circular Progress Component
const CircularProgress = ({ value, size = 120, strokeWidth = 8, color = "text-primary" }: any) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Background Circle */}
            <svg className="transform -rotate-90 w-full h-full">
                <circle
                    className="text-secondary"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                {/* Progress Circle with Glow */}
                <circle
                    className={`${color} transition-all duration-1000 ease-out drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]`}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold">{value}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Score</span>
            </div>
        </div>
    );
};

// Immersive Scanner Overlay
const ScannerOverlay = ({ active, status }: { active: boolean; status: string }) => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
            {active && (
                <>
                    {/* Scanning Grid */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        className="absolute inset-0 bg-[url('/grid-pattern.png')] bg-repeat opacity-20"
                    />

                    {/* Scanning Line */}
                    <motion.div
                        initial={{ top: "0%" }}
                        animate={{ top: "100%" }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent shadow-[0_0_20px_rgba(34,197,94,0.8)]"
                    />

                    {/* Corner Brackets */}
                    <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-green-500/50 rounded-tl-lg" />
                    <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-green-500/50 rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-green-500/50 rounded-bl-lg" />
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-green-500/50 rounded-br-lg" />

                    {/* Status Badge */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-1 rounded-full border border-white/10 text-xs font-mono text-green-400 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        {status || "SEARCHING..."}
                    </div>
                </>
            )}
        </div>
    );
};

interface VerificationStatus {
    score: number;
    verificationLevel: string;
    liveness: { verified: boolean; lastVerification: Date | null; score: number };
    biometrics: { enrolled: boolean; type: string | null; lastVerified: Date | null };
    documents: { verified: boolean; count: number; types: string[] };
}

interface Challenge {
    id: string;
    type: string;
    instruction: string;
    timeoutMs: number;
}

export default function IdentityVerification() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Real biometrics hook (WebAuthn)
    const {
        isSupported: biometricsSupported,
        isEnrolling,
        enrollBiometrics: enrollWithWebAuthn,
        checkAvailability
    } = useBiometrics();

    // Real face detection hook
    const {
        videoRef,
        canvasRef,
        isActive: cameraActive,
        faceDetected,
        motionDetected,
        startCamera,
        stopCamera,
        startDetection,
        stopDetection,
        takeSnapshot
    } = useFaceDetection();

    const [activeTab, setActiveTab] = useState<'overview' | 'liveness' | 'biometrics' | 'documents'>('overview');
    const [livenessSession, setLivenessSession] = useState<any>(null);
    const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
    const [challengeTimer, setChallengeTimer] = useState(5);
    const [documentPreview, setDocumentPreview] = useState<string | null>(null);
    const [livenessProgress, setLivenessProgress] = useState(0);
    const [biometricAvailable, setBiometricAvailable] = useState<{ available: boolean; platformAuthenticator: boolean } | null>(null);
    const [challengeCompleted, setChallengeCompleted] = useState<Record<string, boolean>>({});
    const [pendingCameraStart, setPendingCameraStart] = useState(false);

    // Fetch verification status
    const { data: status, isLoading } = useQuery<{ success: boolean } & VerificationStatus>({
        queryKey: ['identity-status'],
        queryFn: async () => {
            const res = await fetch('/api/identity/status?userId=1');
            return res.json();
        },
        refetchInterval: 5000
    });

    // Start liveness session mutation
    const startLivenessMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/identity/liveness/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: '1' })
            });
            return res.json();
        },
        onSuccess: (data) => {
            setLivenessSession(data);
            setCurrentChallenge(data.currentChallenge);
            startCamera();
        }
    });

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
        } catch (error: any) {
            toast({
                title: 'Biometric Error',
                description: error.message || 'Biometric authentication failed',
                variant: 'destructive'
            });
        }
    };

    // Check biometric availability on mount
    useEffect(() => {
        checkAvailability().then(setBiometricAvailable);
    }, [checkAvailability]);

    // Scan document mutation
    const scanDocumentMutation = useMutation({
        mutationFn: async (imageData: string) => {
            const res = await fetch('/api/identity/document/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: '1', imageData, documentType: 'auto' })
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                toast({
                    title: 'Document Verified!',
                    description: `${data.documentType} scanned successfully. Score: ${data.overallScore}%`
                });
                queryClient.invalidateQueries({ queryKey: ['identity-status'] });
            } else {
                toast({
                    title: 'Verification Failed',
                    description: data.warnings?.join(', ') || 'Could not verify document',
                    variant: 'destructive'
                });
            }
            setDocumentPreview(null);
        }
    });

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
    }, [pendingCameraStart, livenessSession]);

    const completeLiveness = async (frameData?: string | null) => {
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
        } catch (error: any) {
            toast({
                title: 'Verification Failed',
                description: error.message || 'Could not complete liveness verification',
                variant: 'destructive'
            });
        }
    };

    const cancelLiveness = () => {
        stopDetection();
        stopCamera();
        setLivenessSession(null);
        setCurrentChallenge(null);
        setLivenessProgress(0);
    };

    // Challenge timer
    useEffect(() => {
        if (currentChallenge && challengeTimer > 0) {
            const timer = setTimeout(() => setChallengeTimer(t => t - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [currentChallenge, challengeTimer]);

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setDocumentPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

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

    const verificationScore = status?.score || 0;

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />

            <div className="flex-1 md:ml-64 p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header with Trust Score */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 text-primary font-mono text-sm mb-2">
                                <ShieldCheck className="w-4 h-4" />
                                <span>UNIVERSAL TRUST LAYER</span>
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                                Identity Verification
                            </h1>
                            <p className="text-muted-foreground max-w-lg">
                                build your reputation across the CredVerse network. Verify your biometrics and documents to unlock high-trust services.
                            </p>
                        </div>

                        <div className="flex items-center gap-6 bg-card/50 p-4 rounded-2xl border backdrop-blur-sm">
                            <CircularProgress value={verificationScore}
                                color={verificationScore >= 80 ? "text-green-500" : verificationScore >= 50 ? "text-amber-500" : "text-blue-500"}
                            />
                            <div className="space-y-1">
                                <h4 className="font-semibold">Trust Level: {
                                    verificationScore >= 80 ? 'Elite' :
                                        verificationScore >= 50 ? 'Verified' : 'Basic'
                                }</h4>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    {verificationScore >= 80 ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <CircleDot className="w-3 h-3" />}
                                    <span>{verificationScore >= 80 ? 'Maximally Trusted' : 'Complete steps to upgrade'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modern Tabs */}
                    <div className="flex bg-secondary/30 rounded-xl p-1 relative">
                        {[
                            { id: 'overview', label: 'Overview', icon: ShieldCheck },
                            { id: 'liveness', label: 'Liveness', icon: Camera },
                            { id: 'biometrics', label: 'Biometrics', icon: Fingerprint },
                            { id: 'documents', label: 'Documents', icon: ScanLine },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 relative flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 z-10 ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-background shadow-sm border border-border/50 rounded-lg -z-10"
                                    />
                                )}
                                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && (
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-4"
                            >
                                {/* Verification Cards */}
                                <div className="grid md:grid-cols-3 gap-4">
                                    {/* Liveness */}
                                    <div className={`p-6 rounded-xl border ${status?.liveness?.verified ? 'bg-green-50 border-green-200' : 'bg-card'}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <Camera className={`w-8 h-8 ${status?.liveness?.verified ? 'text-green-600' : 'text-muted-foreground'}`} />
                                            {status?.liveness?.verified ? (
                                                <Badge className="bg-green-100 text-green-700">Verified</Badge>
                                            ) : (
                                                <Badge variant="outline">Not Verified</Badge>
                                            )}
                                        </div>
                                        <h3 className="font-semibold mb-1">Liveness Detection</h3>
                                        <p className="text-sm text-muted-foreground mb-4">Prove you're a real person</p>
                                        <Button
                                            className="w-full"
                                            variant={status?.liveness?.verified ? "outline" : "default"}
                                            onClick={() => setActiveTab('liveness')}
                                        >
                                            {status?.liveness?.verified ? 'Verified ✓' : 'Start Verification'}
                                            <ChevronRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>

                                    {/* Biometrics */}
                                    <div className={`p-6 rounded-xl border ${status?.biometrics?.enrolled ? 'bg-green-50 border-green-200' : 'bg-card'}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <Fingerprint className={`w-8 h-8 ${status?.biometrics?.enrolled ? 'text-green-600' : 'text-muted-foreground'}`} />
                                            {status?.biometrics?.enrolled ? (
                                                <Badge className="bg-green-100 text-green-700">Enrolled</Badge>
                                            ) : (
                                                <Badge variant="outline">Not Set</Badge>
                                            )}
                                        </div>
                                        <h3 className="font-semibold mb-1">Biometric Auth</h3>
                                        <p className="text-sm text-muted-foreground mb-4">Face ID or Fingerprint</p>
                                        <Button
                                            className="w-full"
                                            variant={status?.biometrics?.enrolled ? "outline" : "default"}
                                            onClick={() => setActiveTab('biometrics')}
                                        >
                                            {status?.biometrics?.enrolled ? 'Enrolled ✓' : 'Set Up'}
                                            <ChevronRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>

                                    {/* Documents */}
                                    <div className={`p-6 rounded-xl border ${status?.documents?.verified ? 'bg-green-50 border-green-200' : 'bg-card'}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <FileText className={`w-8 h-8 ${status?.documents?.verified ? 'text-green-600' : 'text-muted-foreground'}`} />
                                            {status?.documents?.verified ? (
                                                <Badge className="bg-green-100 text-green-700">{status.documents.count} Verified</Badge>
                                            ) : (
                                                <Badge variant="outline">No Documents</Badge>
                                            )}
                                        </div>
                                        <h3 className="font-semibold mb-1">Document Scan</h3>
                                        <p className="text-sm text-muted-foreground mb-4">Verify your ID documents</p>
                                        <Button
                                            className="w-full"
                                            variant={status?.documents?.verified ? "outline" : "default"}
                                            onClick={() => setActiveTab('documents')}
                                        >
                                            {status?.documents?.verified ? 'Add More' : 'Scan Document'}
                                            <ChevronRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="bg-card p-6 rounded-xl border">
                                    <h3 className="font-semibold mb-4">Verification Progress</h3>
                                    <Progress value={verificationScore} className="h-3 mb-4" />
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Basic</span>
                                        <span>Partial</span>
                                        <span>Full</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'liveness' && (
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
                        )}

                        {activeTab === 'biometrics' && (
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
                        )}

                        {activeTab === 'documents' && (
                            <motion.div
                                key="documents"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-4"
                            >
                                <div className="glass-card p-8 rounded-2xl relative">
                                    <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                                        <ScanLine className="w-5 h-5 text-primary" />
                                        Document Verification source
                                    </h3>

                                    {/* DigiLocker Integration */}
                                    <div className="space-y-6">
                                        <div className="flex items-start gap-6 p-6 bg-gradient-to-br from-blue-600/5 to-blue-600/10 border border-blue-200/50 dark:border-blue-500/20 rounded-2xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-24 bg-blue-500/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />

                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-900/20 flex items-center justify-center shrink-0 z-10">
                                                <ShieldCheck className="w-8 h-8 text-white relative z-10" />
                                                <div className="absolute inset-0 bg-white/20 blur-sm rounded-2xl" />
                                            </div>

                                            <div className="flex-1 relative z-10">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-lg font-bold text-foreground">DigiLocker Connect</h4>
                                                    <Badge variant="outline" className="bg-blue-100/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                                        Government Issued
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                                    Securely fetch and verify your government-issued documents directly from the source.
                                                    Uses W3C Verifiable Credentials standard.
                                                </p>

                                                <div className="flex flex-wrap gap-2 mb-6">
                                                    {['Aadhaar', 'PAN Card', 'Driving License'].map(doc => (
                                                        <span key={doc} className="text-xs bg-background/50 border px-2.5 py-1 rounded-md text-muted-foreground font-mono">
                                                            {doc}
                                                        </span>
                                                    ))}
                                                </div>

                                                <Button
                                                    className="w-full sm:w-auto h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
                                                    onClick={() => window.location.href = '/connect'}
                                                >
                                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                                    Connect Securely
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Benefits Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                { label: 'Blockchain Secured', icon: CheckCircle2 },
                                                { label: 'Instant Verification', icon: Zap },
                                                { label: 'Fraud Proof', icon: Shield },
                                                { label: 'Privacy First', icon: EyeOff }
                                            ].map((item, i) => (
                                                <div key={i} className="flex flex-col items-center justify-center p-4 bg-secondary/20 rounded-xl border border-border/50 text-center gap-2">
                                                    <item.icon className="w-5 h-5 text-green-500" />
                                                    <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <p className="text-xs text-center text-muted-foreground/60 pt-4 border-t border-border/50">
                                            <Shield className="w-3 h-3 inline mr-1" />
                                            Your data is encrypted end-to-end. We never store your raw documents.
                                        </p>
                                    </div>


                                    {/* Verified Documents */}
                                    {status?.documents?.types && status.documents.types.length > 0 && (
                                        <div className="mt-6 pt-6 border-t">
                                            <h4 className="font-medium mb-3">Verified Documents</h4>
                                            <div className="space-y-2">
                                                {status.documents.types.map((type, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                        <span className="capitalize">{type.replace('_', ' ')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div >
    );
}
