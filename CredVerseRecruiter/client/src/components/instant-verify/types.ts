export interface VerificationCheck {
  name: string;
  status: "passed" | "failed" | "warning" | "skipped";
  message: string;
  details?: Record<string, unknown>;
}

export interface VerificationResult {
  status: "verified" | "failed" | "suspicious" | "pending";
  confidence: number;
  checks: VerificationCheck[];
  riskScore: number;
  riskFlags: string[];
  timestamp: string;
  verificationId: string;
}

export type FraudFlag =
  | string
  | {
      type?: string;
      severity?: string;
      description?: string;
      message?: string;
    };

export interface FraudAnalysis {
  score: number;
  ruleScore?: number;
  aiScore?: number;
  flags: FraudFlag[];
  recommendation: "accept" | "approve" | "review" | "reject";
  details: { check: string; status?: string; message?: string; result?: string; impact?: number }[];
  ai?: {
    provider: string;
    score: number;
    confidence: number;
    summary: string;
    signals: Array<{ code: string; severity: string; message: string }>;
  };
}

export interface VerificationRecord {
  id: string;
  credentialType: string;
  issuer: string;
  subject: string;
  status: string;
  riskScore: number;
  fraudScore: number;
  recommendation: string;
}

export type ViewState = "idle" | "verifying" | "result";

export type DecisionTier = "PASS" | "REVIEW" | "FAIL";

export interface ToneClasses {
  border: string;
  headerBg: string;
  pill: string;
  iconWrap: string;
  title: string;
}

export interface ReasonCode {
  source: "verifier" | "ai" | "fraud";
  code: string;
  severity?: string;
  message?: string;
}

export interface Evidence {
  signature?: VerificationCheck;
  issuer?: VerificationCheck;
  anchor?: VerificationCheck;
  revocation?: VerificationCheck;
  did?: VerificationCheck;
}
