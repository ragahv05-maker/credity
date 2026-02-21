/**
 * Fraud Detection Service for CredVerse Recruiter Portal
 * Rules engine + AI anomaly copilot (deterministic fallback when provider is unavailable).
 */

import {
  AIAnomalyResult,
  analyzeCredentialAnomalyRisk,
} from "./ai-anomaly-adapter";

export interface FraudAnalysisResult {
  score: number; // 0-100 (higher = more suspicious)
  ruleScore: number; // baseline score from deterministic checks
  aiScore: number; // score from AI/deterministic anomaly copilot
  flags: string[];
  recommendation: "accept" | "review" | "reject";
  details: FraudDetail[];
  ai: AIAnomalyResult;
  mode: "rules-only" | "hybrid-ai";
}

export interface FraudDetail {
  check: string;
  status: "passed" | "warning" | "failed";
  message: string;
}

const AI_RULE_WEIGHT = Number(process.env.AI_RISK_RULE_WEIGHT || 0.68);
const AI_MODEL_WEIGHT = Number(process.env.AI_RISK_MODEL_WEIGHT || 0.32);

function normalizeWeights(): { ruleWeight: number; aiWeight: number } {
  const safeRule =
    Number.isFinite(AI_RULE_WEIGHT) && AI_RULE_WEIGHT >= 0
      ? AI_RULE_WEIGHT
      : 0.68;
  const safeAI =
    Number.isFinite(AI_MODEL_WEIGHT) && AI_MODEL_WEIGHT >= 0
      ? AI_MODEL_WEIGHT
      : 0.32;
  const sum = safeRule + safeAI;
  if (sum <= 0) {
    return { ruleWeight: 0.7, aiWeight: 0.3 };
  }
  return {
    ruleWeight: safeRule / sum,
    aiWeight: safeAI / sum,
  };
}

function mapSignalSeverityToDetailStatus(
  severity: "low" | "medium" | "high",
): FraudDetail["status"] {
  if (severity === "high") return "failed";
  if (severity === "medium") return "warning";
  return "passed";
}

/**
 * Fraud Detector Class
 */
class FraudDetector {
  private suspiciousPatterns: RegExp[] = [
    /test/i,
    /fake/i,
    /sample/i,
    /demo/i,
    /placeholder/i,
  ];

  private knownFraudulentIssuers: Set<string> = new Set([
    "fake-university",
    "diploma-mill.com",
    "instant-degrees.net",
  ]);

  getStatistics(): {
    suspiciousPatternCount: number;
    knownFraudulentIssuerCount: number;
    modelVersion: string;
    mode: "rules-only" | "hybrid-ai";
    aiProvider: string;
  } {
    const hasProvider = Boolean(
      process.env.OPENAI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.DEEPSEEK_API_KEY,
    );
    const aiProvider = process.env.OPENAI_API_KEY
      ? "openai"
      : process.env.GEMINI_API_KEY
        ? "gemini"
        : process.env.DEEPSEEK_API_KEY
          ? "deepseek"
          : "deterministic";

    return {
      suspiciousPatternCount: this.suspiciousPatterns.length,
      knownFraudulentIssuerCount: this.knownFraudulentIssuers.size,
      modelVersion: hasProvider
        ? "rules-v2+ai-risk-v1"
        : "rules-v2+deterministic-risk-v1",
      mode: "hybrid-ai",
      aiProvider,
    };
  }

  /**
   * Analyze a credential for fraud indicators
   */
  async analyzeCredential(credential: any): Promise<FraudAnalysisResult> {
    const flags: string[] = [];
    const details: FraudDetail[] = [];
    let ruleScore = 0;

    // Check 1: Issuer Analysis
    const issuerCheck = this.checkIssuer(credential);
    details.push(issuerCheck);
    if (issuerCheck.status === "failed") {
      ruleScore += 40;
      flags.push("FRAUDULENT_ISSUER");
    } else if (issuerCheck.status === "warning") {
      ruleScore += 15;
      flags.push("UNKNOWN_ISSUER");
    }

    // Check 2: Temporal Anomalies
    const temporalCheck = this.checkTemporalAnomalies(credential);
    details.push(temporalCheck);
    if (temporalCheck.status === "failed") {
      ruleScore += 30;
      flags.push("TEMPORAL_ANOMALY");
    } else if (temporalCheck.status === "warning") {
      ruleScore += 10;
      flags.push("TEMPORAL_WARNING");
    }

    // Check 3: Content Patterns
    const contentCheck = this.checkContentPatterns(credential);
    details.push(contentCheck);
    if (contentCheck.status === "failed") {
      ruleScore += 25;
      flags.push("SUSPICIOUS_CONTENT");
    } else if (contentCheck.status === "warning") {
      ruleScore += 10;
      flags.push("CONTENT_WARNING");
    }

    // Check 4: Format Consistency
    const formatCheck = this.checkFormatConsistency(credential);
    details.push(formatCheck);
    if (formatCheck.status === "failed") {
      ruleScore += 20;
      flags.push("FORMAT_INCONSISTENT");
    }

    // Check 5: Subject Validation
    const subjectCheck = this.checkSubjectInfo(credential);
    details.push(subjectCheck);
    if (subjectCheck.status === "warning") {
      ruleScore += 10;
      flags.push("INCOMPLETE_SUBJECT");
    }

    const boundedRuleScore = Math.min(100, ruleScore);

    const ai = await analyzeCredentialAnomalyRisk({
      credential:
        credential && typeof credential === "object" ? credential : {},
      ruleScore: boundedRuleScore,
      ruleFlags: [...flags],
    });

    const { ruleWeight, aiWeight } = normalizeWeights();
    const combinedScore = Math.min(
      100,
      Math.round(boundedRuleScore * ruleWeight + ai.score * aiWeight),
    );

    for (const signal of ai.signals) {
      details.push({
        check: `AI Signal · ${signal.code}`,
        status: mapSignalSeverityToDetailStatus(signal.severity),
        message: signal.message,
      });

      if (signal.severity === "high" || signal.severity === "medium") {
        flags.push(`AI_${signal.code}`);
      }
    }

    const uniqueFlags = Array.from(new Set(flags));

    // Determine recommendation
    let recommendation: "accept" | "review" | "reject";
    if (combinedScore >= 50) {
      recommendation = "reject";
    } else if (combinedScore >= 25) {
      recommendation = "review";
    } else {
      recommendation = "accept";
    }

    return {
      score: combinedScore,
      ruleScore: boundedRuleScore,
      aiScore: ai.score,
      flags: uniqueFlags,
      recommendation,
      details,
      ai,
      mode: "hybrid-ai",
    };
  }

  /**
   * Check issuer for fraud indicators
   */
  private checkIssuer(credential: any): FraudDetail {
    const issuer = credential.issuer?.id || credential.issuer || credential.iss;

    if (!issuer) {
      return {
        check: "Issuer Validation",
        status: "warning",
        message: "No issuer information found",
      };
    }

    const issuerStr =
      typeof issuer === "string" ? issuer : JSON.stringify(issuer);

    if (this.knownFraudulentIssuers.has(issuerStr.toLowerCase())) {
      return {
        check: "Issuer Validation",
        status: "failed",
        message: "Issuer is on fraudulent list",
      };
    }

    // Check for valid DID format
    if (typeof issuer === "string" && issuer.startsWith("did:")) {
      return {
        check: "Issuer Validation",
        status: "passed",
        message: "Valid DID issuer format",
      };
    }

    return {
      check: "Issuer Validation",
      status: "warning",
      message: "Issuer format not standard DID",
    };
  }

  /**
   * Check for temporal anomalies
   */
  private checkTemporalAnomalies(credential: any): FraudDetail {
    const issuanceDate = credential.issuanceDate || credential.iat;

    if (!issuanceDate) {
      return {
        check: "Temporal Analysis",
        status: "warning",
        message: "No issuance date found",
      };
    }

    const issued =
      typeof issuanceDate === "number"
        ? new Date(issuanceDate * 1000)
        : new Date(issuanceDate);

    // Future issuance date is suspicious
    if (issued > new Date()) {
      return {
        check: "Temporal Analysis",
        status: "failed",
        message: "Credential issuance date is in the future",
      };
    }

    // Very old credentials might need review
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    if (issued < tenYearsAgo) {
      return {
        check: "Temporal Analysis",
        status: "warning",
        message: "Credential is over 10 years old",
      };
    }

    return {
      check: "Temporal Analysis",
      status: "passed",
      message: "Temporal data appears valid",
    };
  }

  /**
   * Check content for suspicious patterns
   */
  private checkContentPatterns(credential: any): FraudDetail {
    const content = JSON.stringify(credential);
    const suspiciousFound: string[] = [];

    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(content)) {
        suspiciousFound.push(pattern.source);
      }
    }

    if (suspiciousFound.length > 2) {
      return {
        check: "Content Analysis",
        status: "failed",
        message: `Multiple suspicious patterns found: ${suspiciousFound.join(", ")}`,
      };
    }

    if (suspiciousFound.length > 0) {
      return {
        check: "Content Analysis",
        status: "warning",
        message: "Potential test/demo content detected",
      };
    }

    return {
      check: "Content Analysis",
      status: "passed",
      message: "No suspicious content patterns detected",
    };
  }

  /**
   * Check format consistency
   */
  private checkFormatConsistency(credential: any): FraudDetail {
    // Check for W3C VC format compliance
    const hasContext = credential["@context"] || credential.context;
    const hasType = credential.type;
    const hasIssuer = credential.issuer || credential.iss;

    if (!hasContext && !hasType && !hasIssuer) {
      return {
        check: "Format Validation",
        status: "failed",
        message: "Credential lacks standard VC structure",
      };
    }

    if (!hasContext || !hasType) {
      return {
        check: "Format Validation",
        status: "warning",
        message: "Credential missing some standard fields",
      };
    }

    return {
      check: "Format Validation",
      status: "passed",
      message: "Credential format is valid",
    };
  }

  /**
   * Check subject information
   */
  private checkSubjectInfo(credential: any): FraudDetail {
    const subject = credential.credentialSubject || credential.sub;

    if (!subject) {
      return {
        check: "Subject Validation",
        status: "warning",
        message: "No credential subject found",
      };
    }

    const subjectObj = typeof subject === "object" ? subject : {};
    const hasName = (subjectObj as any).name || (subjectObj as any).id;

    if (!hasName) {
      return {
        check: "Subject Validation",
        status: "warning",
        message: "Subject lacks identifying information",
      };
    }

    return {
      check: "Subject Validation",
      status: "passed",
      message: "Subject information present",
    };
  }
}

// Singleton export
export const fraudDetector = new FraudDetector();
