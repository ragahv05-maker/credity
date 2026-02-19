import { motion } from "framer-motion";
import {
    Camera,
    ChevronRight,
    FileText,
    Fingerprint
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { VerificationStatus } from "./types";

interface OverviewTabProps {
    status: VerificationStatus | undefined;
    onTabChange: (tab: 'liveness' | 'biometrics' | 'documents') => void;
}

export const OverviewTab = ({ status, onTabChange }: OverviewTabProps) => {
    return (
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
                        onClick={() => onTabChange('liveness')}
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
                        onClick={() => onTabChange('biometrics')}
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
                        onClick={() => onTabChange('documents')}
                    >
                        {status?.documents?.verified ? 'Add More' : 'Scan Document'}
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>

            {/* Progress */}
            <div className="bg-card p-6 rounded-xl border">
                <h3 className="font-semibold mb-4">Verification Progress</h3>
                <Progress value={status?.score || 0} className="h-3 mb-4" />
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Basic</span>
                    <span>Partial</span>
                    <span>Full</span>
                </div>
            </div>
        </motion.div>
    );
};
