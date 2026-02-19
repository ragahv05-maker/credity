import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    ScanLine,
    ShieldCheck,
    CheckCircle2,
    Zap,
    Shield,
    EyeOff
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { VerificationStatus } from "./types";

interface DocumentsTabProps {
    status: VerificationStatus | undefined;
}

export const DocumentsTab = ({ status }: DocumentsTabProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [documentPreview, setDocumentPreview] = useState<string | null>(null);

    // Scan document mutation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // Handle file upload
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    return (
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
    );
};
