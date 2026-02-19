export interface VerificationStatus {
    score: number;
    verificationLevel: string;
    liveness: { verified: boolean; lastVerification: Date | null; score: number };
    biometrics: { enrolled: boolean; type: string | null; lastVerified: Date | null };
    documents: { verified: boolean; count: number; types: string[] };
}

export interface Challenge {
    id: string;
    type: string;
    instruction: string;
    timeoutMs: number;
}
