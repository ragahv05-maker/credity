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

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/sidebar";
import {
    Camera,
    CheckCircle2,
    ShieldCheck,
    Fingerprint,
    ScanLine,
    CircleDot
} from "lucide-react";

import { CircularProgress } from "@/components/identity/circular-progress";
import { OverviewTab } from "@/components/identity/overview-tab";
import { LivenessTab } from "@/components/identity/liveness-tab";
import { BiometricsTab } from "@/components/identity/biometrics-tab";
import { DocumentsTab } from "@/components/identity/documents-tab";
import { VerificationStatus } from "@/components/identity/types";

type TabId = 'overview' | 'liveness' | 'biometrics' | 'documents';

export default function IdentityVerification() {
    const [activeTab, setActiveTab] = useState<TabId>('overview');

    // Fetch verification status
    const { data: status } = useQuery<{ success: boolean } & VerificationStatus>({
        queryKey: ['identity-status'],
        queryFn: async () => {
            const res = await fetch('/api/identity/status?userId=1');
            return res.json();
        },
        refetchInterval: 5000
    });

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
                                onClick={() => setActiveTab(tab.id as TabId)}
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
                            <OverviewTab status={status} onTabChange={setActiveTab} />
                        )}

                        {activeTab === 'liveness' && (
                            <LivenessTab />
                        )}

                        {activeTab === 'biometrics' && (
                            <BiometricsTab status={status} />
                        )}

                        {activeTab === 'documents' && (
                            <DocumentsTab status={status} />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div >
    );
}
