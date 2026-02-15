/**
 * Claims Verification Service
 * Implements PRD v3.1 Feature 2: Claims Verification System (B2B Core)
 * 
 * Three-Layer Verification:
 * - Layer 1: Identity Verification (WHO) - 40%
 * - Layer 2: Claims Validation (WHAT) - 30%
 * - Layer 3: Evidence Authentication (PROOF) - 30%
 */
import { detectDeepfakeFromUrl } from './deepfake-detection-service';
import { scoreClaimConfidence } from './confidence-scoring-adapter';
import { claimsPersistence } from './claims-persistence';
import { ReasonCodes, stableSortReasonCodes, type ReasonCode } from '../contracts/reason-codes';

export interface TimelineEvent {
    event: string;
    time: string;
    location: string;
}

export interface EvidenceItem {
    type: 'image' | 'video' | 'document';
    url: string;
    uploadedAt: string;
}

export interface ClaimVerifyRequest {
    userId: string;
    claimType: 'insurance_auto' | 'refund_request' | 'age_verification' | 'identity_check';
    claimAmount?: number;
    description: string;
    timeline: TimelineEvent[];
    evidence: EvidenceItem[];
    userCredentials: string[];
}

export type RiskSignalSeverity = 'info' | 'low' | 'medium' | 'high';

export interface RiskSignal {
    /**
     * Stable machine-readable id (do not change without version bump).
     * Example: integrity.fraud_pattern
     */
    id: string;
    /**
     * Normalized score 0..1 where higher means higher risk.
     */
    score: number;
    severity: RiskSignalSeverity;
    source: 'rules' | 'ai' | 'provider';
    reason_codes: ReasonCode[];
    details?: Record<string, unknown>;
}

export interface ClaimVerifyResponse {
    claimId: string;
    trustScore: number;
    recommendation: 'approve' | 'review' | 'investigate' | 'reject';
    /** Stable machine-readable reason codes derived from rules + AI/provider signals */
    reasonCodes: ReasonCode[];
    /** Normalized, versionable risk signal objects (safe for audit/logging) */
    riskSignals: RiskSignal[];
    breakdown: {
        identityScore: number;
        integrityScore: number;
        authenticityScore: number;
    };
    /**
     * Human-readable red flags (legacy).
     * Prefer reasonCodes + riskSignals for deterministic interpretation.
     */
    redFlags: string[];
    aiAnalysis: {
        deepfakeDetected: boolean;
        deepfakeVerdict: 'real' | 'fake' | 'unknown';
        deepfakeConfidence: number | null;
        timelineConsistent: boolean;
        fraudPatternMatch: number;
        llmConfidence: number;
    };
    processingTimeMs: number;
    costBreakdown: {
        identityVerification: number;
        mlInference: number;
        llmAnalysis: number;
        deepfakeCheck: number;
        blockchainTimestamp: number;
        totalInr: number;
    };
}

/**
 * Main claims verification function
 * Implements the 3-layer verification process per PRD v3.1
 */
export async function verifyClaim(request: ClaimVerifyRequest): Promise<ClaimVerifyResponse> {
    const startTime = Date.now();
    const claimId = `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Layer 1: Identity Verification (WHO)
    const identityResult = await verifyIdentity(request);

    // Layer 2: Claims Validation (WHAT)
    const integrityResult = await validateClaim(request);

    // Layer 3: Evidence Authentication (PROOF)
    const authenticityResult = await authenticateEvidence(request);

    // Calculate Trust Score using PRD v3.1 formula
    // Trust Score = (Identity × 0.4) + (Integrity × 0.3) + (Authenticity × 0.3)
    const trustScore = Math.round(
        (identityResult.score * 0.4) +
        (integrityResult.score * 0.3) +
        (authenticityResult.score * 0.3)
    );

    // Determine recommendation based on Trust Score
    const recommendation = getRecommendation(trustScore);

    // Combine all red flags (legacy)
    const redFlags = [
        ...identityResult.redFlags,
        ...integrityResult.redFlags,
        ...authenticityResult.redFlags
    ];

    const reasonCodes = stableSortReasonCodes([
        ...identityResult.reasonCodes,
        ...integrityResult.reasonCodes,
        ...authenticityResult.reasonCodes,
    ]) as ReasonCode[];

    const riskSignals = [...identityResult.riskSignals, ...integrityResult.riskSignals, ...authenticityResult.riskSignals]
        .map((signal) => ({ ...signal, reason_codes: stableSortReasonCodes(signal.reason_codes) as ReasonCode[] }))
        .sort((a, b) => a.id.localeCompare(b.id));

    const processingTimeMs = Date.now() - startTime;

    return {
        claimId,
        trustScore,
        recommendation,
        reasonCodes,
        riskSignals,
        breakdown: {
            identityScore: identityResult.score,
            integrityScore: integrityResult.score,
            authenticityScore: authenticityResult.score
        },
        redFlags,
        aiAnalysis: {
            deepfakeDetected: authenticityResult.deepfakeDetected,
            deepfakeVerdict: authenticityResult.deepfakeVerdict,
            deepfakeConfidence: authenticityResult.deepfakeConfidence,
            timelineConsistent: integrityResult.timelineConsistent,
            fraudPatternMatch: integrityResult.fraudPatternMatch,
            llmConfidence: integrityResult.llmConfidence
        },
        processingTimeMs,
        costBreakdown: calculateCost(request)
    };
}

/**
 * Layer 1: Identity Verification
 * Verifies the user is who they claim to be
 */
interface IdentityResult {
    score: number;
    redFlags: string[];
    reasonCodes: ReasonCode[];
    riskSignals: RiskSignal[];
    credentialsVerified: string[];
}

async function verifyIdentity(request: ClaimVerifyRequest): Promise<IdentityResult> {
    const redFlags: string[] = [];
    const reasonCodes: ReasonCode[] = [];
    const riskSignals: RiskSignal[] = [];
    let score = 0;
    const credentialsVerified: string[] = [];

    // Check if user has "verified_human" credential
    if (request.userCredentials.includes('verified_human')) {
        score += 40; // Base score for verified human
        credentialsVerified.push('verified_human');
    } else {
        redFlags.push('User does not have verified_human credential');
        reasonCodes.push(ReasonCodes.IDENTITY_MISSING_VERIFIED_HUMAN);
        score += 10; // Minimal score without verification
    }

    // Check for government ID
    if (request.userCredentials.includes('government_id')) {
        score += 30;
        credentialsVerified.push('government_id');
    }

    // Check for age verification (if applicable)
    if (request.userCredentials.includes('age_18') || request.userCredentials.includes('age_21')) {
        score += 15;
        credentialsVerified.push('age_verified');
    }

    // Check for location credential
    if (request.userCredentials.includes('location')) {
        score += 15;
        credentialsVerified.push('location');
    }

    // Cap at 100
    score = Math.min(100, score);

    // Flag if no credentials provided
    if (request.userCredentials.length === 0) {
        redFlags.push('No credentials provided with claim');
        reasonCodes.push(ReasonCodes.IDENTITY_NO_CREDENTIALS_PROVIDED);
        score = 20; // Very low score
    }

    // Normalize risk signal (higher score = higher risk)
    const identityRisk = Number((1 - score / 100).toFixed(3));
    riskSignals.push({
        id: 'identity.credentials',
        score: identityRisk,
        severity: identityRisk > 0.7 ? 'high' : identityRisk > 0.4 ? 'medium' : identityRisk > 0.2 ? 'low' : 'info',
        source: 'rules',
        reason_codes: stableSortReasonCodes(reasonCodes) as ReasonCode[],
        details: { credentials_verified: credentialsVerified, provided_count: request.userCredentials.length },
    });

    return { score, redFlags, reasonCodes: stableSortReasonCodes(reasonCodes) as ReasonCode[], riskSignals, credentialsVerified };
}

/**
 * Layer 2: Claims Validation
 * Validates the claim content and timeline
 */
interface IntegrityResult {
    score: number;
    redFlags: string[];
    reasonCodes: ReasonCode[];
    riskSignals: RiskSignal[];
    timelineConsistent: boolean;
    fraudPatternMatch: number;
    llmConfidence: number;
}

async function validateClaim(request: ClaimVerifyRequest): Promise<IntegrityResult> {
    const redFlags: string[] = [];
    const reasonCodes: ReasonCode[] = [];
    const riskSignals: RiskSignal[] = [];
    let score = 50; // Start at neutral

    // Timeline Analysis
    const timelineAnalysis = analyzeTimeline(request.timeline);
    const timelineConsistent = timelineAnalysis.isConsistent;

    if (timelineConsistent) {
        score += 25;
    } else {
        score -= 20;
        redFlags.push(...timelineAnalysis.issues);
        reasonCodes.push(ReasonCodes.INTEGRITY_TIMELINE_INCONSISTENT);
    }

    // Pattern Matching (simplified - in production would use ML model)
    const fraudPatternMatch = checkFraudPatterns(request);
    if (fraudPatternMatch > 0.7) {
        score -= 30;
        redFlags.push(`High fraud pattern match: ${(fraudPatternMatch * 100).toFixed(0)}%`);
        reasonCodes.push(ReasonCodes.INTEGRITY_FRAUD_PATTERN_HIGH);
    } else if (fraudPatternMatch > 0.4) {
        score -= 15;
        redFlags.push(`Moderate fraud pattern similarity detected`);
        reasonCodes.push(ReasonCodes.INTEGRITY_FRAUD_PATTERN_MEDIUM);
    } else {
        score += 15;
    }

    // Provider-backed confidence scoring (versioned adapter with deterministic fallback)
    const confidenceResult = await scoreClaimConfidence({
        claimType: request.claimType,
        claimAmount: request.claimAmount,
        description: request.description,
        timelineCount: request.timeline.length,
        evidenceCount: request.evidence.length,
    });
    const llmConfidence = confidenceResult.confidence;
    if (llmConfidence > 0.8) {
        score += 10;
    } else if (llmConfidence < 0.5) {
        score -= 10;
        redFlags.push(`Claim description raises concerns (${confidenceResult.reason})`);
        reasonCodes.push(ReasonCodes.INTEGRITY_LLM_CONFIDENCE_LOW);
    }

    // Claim amount reasonability check
    if (request.claimAmount) {
        if (request.claimType === 'insurance_auto' && request.claimAmount > 1000000) {
            redFlags.push('Unusually high claim amount');
            reasonCodes.push(ReasonCodes.INTEGRITY_CLAIM_AMOUNT_UNUSUALLY_HIGH);
            score -= 10;
        }
        if (request.claimType === 'refund_request' && request.claimAmount > 50000) {
            redFlags.push('Refund amount above normal threshold');
            reasonCodes.push(ReasonCodes.INTEGRITY_REFUND_AMOUNT_ABOVE_THRESHOLD);
            score -= 5;
        }
    }

    // Cap between 0 and 100
    score = Math.max(0, Math.min(100, score));

    const fraudRisk = Number(fraudPatternMatch.toFixed(3));
    riskSignals.push({
        id: 'integrity.fraud_pattern',
        score: fraudRisk,
        severity: fraudRisk > 0.7 ? 'high' : fraudRisk > 0.4 ? 'medium' : fraudRisk > 0.2 ? 'low' : 'info',
        source: 'rules',
        reason_codes: stableSortReasonCodes(reasonCodes) as ReasonCode[],
        details: { fraud_pattern_match: fraudPatternMatch },
    });

    const timelineRisk = timelineConsistent ? 0 : 0.6;
    riskSignals.push({
        id: 'integrity.timeline',
        score: timelineRisk,
        severity: timelineRisk >= 0.6 ? 'medium' : 'info',
        source: 'rules',
        reason_codes: stableSortReasonCodes(reasonCodes) as ReasonCode[],
        details: { timeline_consistent: timelineConsistent, issues_count: timelineAnalysis.issues.length },
    });

    const llmRisk = Number((1 - llmConfidence).toFixed(3));
    riskSignals.push({
        id: 'integrity.description_confidence',
        score: llmRisk,
        severity: llmRisk > 0.6 ? 'medium' : llmRisk > 0.3 ? 'low' : 'info',
        source: confidenceResult.provider === 'deterministic' ? 'ai' : 'provider',
        reason_codes: stableSortReasonCodes(reasonCodes) as ReasonCode[],
        details: { llm_confidence: llmConfidence, provider: confidenceResult.provider, provider_reason: confidenceResult.reason },
    });

    return {
        score,
        redFlags,
        reasonCodes: stableSortReasonCodes(reasonCodes) as ReasonCode[],
        riskSignals,
        timelineConsistent,
        fraudPatternMatch,
        llmConfidence
    };
}

/**
 * Layer 3: Evidence Authentication
 * Validates the evidence provided with the claim
 */
interface AuthenticityResult {
    score: number;
    redFlags: string[];
    reasonCodes: ReasonCode[];
    riskSignals: RiskSignal[];
    deepfakeDetected: boolean;
    deepfakeVerdict: 'real' | 'fake' | 'unknown';
    deepfakeConfidence: number | null;
    metadataValid: boolean;
    blockchainVerified: boolean;
}

async function authenticateEvidence(request: ClaimVerifyRequest): Promise<AuthenticityResult> {
    const redFlags: string[] = [];
    const reasonCodes: ReasonCode[] = [];
    const riskSignals: RiskSignal[] = [];
    let score = 50; // Start at neutral

    // If no evidence provided
    if (request.evidence.length === 0) {
        redFlags.push('No evidence provided');
        reasonCodes.push(ReasonCodes.EVIDENCE_NONE_PROVIDED);
        riskSignals.push({
            id: 'evidence.presence',
            score: 0.25,
            severity: 'low',
            source: 'rules',
            reason_codes: stableSortReasonCodes(reasonCodes) as ReasonCode[],
            details: { evidence_count: 0 },
        });

        return {
            score: 60, // Some claims don't require evidence
            redFlags,
            reasonCodes: stableSortReasonCodes(reasonCodes) as ReasonCode[],
            riskSignals,
            deepfakeDetected: false,
            deepfakeVerdict: 'unknown',
            deepfakeConfidence: null,
            metadataValid: true,
            blockchainVerified: false
        };
    }

    const mediaEvidence = request.evidence.filter((item) => item.type === 'image' || item.type === 'video');
    const deepfakeResults = await Promise.all(mediaEvidence.map((item) => detectDeepfakeFromUrl(item.url)));
    const hasFake = deepfakeResults.some((result) => result.verdict === 'fake');
    const hasUnknown = deepfakeResults.length > 0 && deepfakeResults.every((result) => result.verdict === 'unknown');
    const confidenceValues = deepfakeResults
        .map((result) => result.confidence)
        .filter((value): value is number => typeof value === 'number');
    const averageConfidence = confidenceValues.length > 0
        ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
        : null;
    const deepfakeDetected = hasFake;

    if (deepfakeDetected) {
        score = 10;
        redFlags.push('AI-generated content detected in evidence');
        reasonCodes.push(ReasonCodes.EVIDENCE_DEEPFAKE_DETECTED);
    } else if (hasUnknown) {
        score -= 10;
        redFlags.push('Deepfake detection provider unavailable; authenticity confidence reduced');
        reasonCodes.push(ReasonCodes.EVIDENCE_DEEPFAKE_PROVIDER_UNAVAILABLE);
    } else {
        score += 20;
    }

    // Metadata Validation (simplified)
    const metadataValid = validateEvidenceMetadata(request);
    if (metadataValid) {
        score += 20;
    } else {
        score -= 15;
        redFlags.push('Evidence metadata inconsistent with claim');
        reasonCodes.push(ReasonCodes.EVIDENCE_METADATA_INCONSISTENT);
    }

    // Blockchain Verification (placeholder)
    const blockchainVerified = request.evidence.length > 0;
    if (blockchainVerified) {
        score += 10;
    }

    // Evidence quantity check
    if (request.evidence.length >= 3) {
        score += 10; // Good amount of evidence
    }

    // Cap between 0 and 100
    score = Math.max(0, Math.min(100, score));

    const deepfakeRisk = deepfakeDetected ? 1 : hasUnknown ? 0.4 : 0;
    riskSignals.push({
        id: 'evidence.deepfake',
        score: deepfakeRisk,
        severity: deepfakeRisk >= 1 ? 'high' : deepfakeRisk >= 0.4 ? 'medium' : 'info',
        source: hasUnknown ? 'provider' : 'ai',
        reason_codes: stableSortReasonCodes(reasonCodes) as ReasonCode[],
        details: {
            verdict: deepfakeDetected ? 'fake' : hasUnknown ? 'unknown' : 'real',
            confidence: averageConfidence,
            evidence_count: mediaEvidence.length,
        },
    });

    const metadataRisk = metadataValid ? 0 : 0.6;
    riskSignals.push({
        id: 'evidence.metadata',
        score: metadataRisk,
        severity: metadataRisk >= 0.6 ? 'medium' : 'info',
        source: 'rules',
        reason_codes: stableSortReasonCodes(reasonCodes) as ReasonCode[],
        details: { metadata_valid: metadataValid },
    });

    return {
        score,
        redFlags,
        reasonCodes: stableSortReasonCodes(reasonCodes) as ReasonCode[],
        riskSignals,
        deepfakeDetected,
        deepfakeVerdict: deepfakeDetected ? 'fake' : hasUnknown ? 'unknown' : 'real',
        deepfakeConfidence: averageConfidence,
        metadataValid,
        blockchainVerified
    };
}

/**
 * Analyze timeline for logical consistency
 */
function analyzeTimeline(timeline: TimelineEvent[]): { isConsistent: boolean; issues: string[] } {
    const issues: string[] = [];

    if (timeline.length === 0) {
        return { isConsistent: true, issues: [] }; // No timeline to validate
    }

    // Sort by time
    const sorted = [...timeline].sort((a, b) =>
        new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    // Check for impossible time gaps
    for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];

        const timeDiffMs = new Date(curr.time).getTime() - new Date(prev.time).getTime();
        const timeDiffMinutes = timeDiffMs / (1000 * 60);

        // Check if locations are different but time is too short
        if (prev.location !== curr.location && timeDiffMinutes < 30) {
            // Different cities in less than 30 min is suspicious
            if (!isSameCity(prev.location, curr.location)) {
                issues.push(`Impossible travel: ${prev.location} to ${curr.location} in ${timeDiffMinutes} minutes`);
            }
        }

        // Check for negative time (events out of order)
        if (timeDiffMs < 0) {
            issues.push(`Events out of order: ${prev.event} after ${curr.event}`);
        }
    }

    return {
        isConsistent: issues.length === 0,
        issues
    };
}

/**
 * Check if two locations are in the same city
 */
function isSameCity(loc1: string, loc2: string): boolean {
    return loc1.toLowerCase().trim() === loc2.toLowerCase().trim();
}

/**
 * Check for known fraud patterns
 */
function checkFraudPatterns(request: ClaimVerifyRequest): number {
    let patternScore = 0;
    const description = request.description.toLowerCase();

    // Common fraud indicators
    const fraudIndicators = [
        'urgent', 'emergency', 'immediately', 'asap',
        'no receipt', 'lost documentation', 'can\'t provide',
        'third party', 'someone else', 'friend\'s',
    ];

    for (const indicator of fraudIndicators) {
        if (description.includes(indicator)) {
            patternScore += 0.15;
        }
    }

    // High amount with minimal evidence
    if (request.claimAmount && request.claimAmount > 100000 && request.evidence.length < 2) {
        patternScore += 0.2;
    }

    // Very short description for complex claim
    if (request.claimType === 'insurance_auto' && request.description.length < 50) {
        patternScore += 0.1;
    }

    return Math.min(1, patternScore);
}

/**
 * Validate evidence metadata consistency
 */
function validateEvidenceMetadata(request: ClaimVerifyRequest): boolean {
    // Check if evidence upload times are reasonable (within claim timeline)
    if (request.timeline.length === 0 || request.evidence.length === 0) {
        return true; // No timeline to validate against
    }

    const earliestEvent = new Date(
        Math.min(...request.timeline.map(t => new Date(t.time).getTime()))
    );

    for (const ev of request.evidence) {
        const evidenceTime = new Date(ev.uploadedAt);
        // Evidence should generally be uploaded after the event
        if (evidenceTime < earliestEvent) {
            // Evidence uploaded before the event occurred is suspicious
            return false;
        }
    }

    return true;
}

/**
 * Get recommendation based on Trust Score
 */
function getRecommendation(trustScore: number): ClaimVerifyResponse['recommendation'] {
    if (trustScore >= 90) return 'approve';
    if (trustScore >= 70) return 'review';
    if (trustScore >= 50) return 'investigate';
    return 'reject';
}

/**
 * Calculate processing cost breakdown
 */
function calculateCost(request: ClaimVerifyRequest): ClaimVerifyResponse['costBreakdown'] {
    const identityVerification = 0; // Free (already verified in wallet)
    const mlInference = 2.00; // Base ML cost
    const llmAnalysis = 0.02; // ~500 tokens at ₹0.04/1K
    const deepfakeConfigured = Boolean(process.env.DEEPFAKE_API_URL && process.env.DEEPFAKE_API_KEY);
    const deepfakeCheck = request.evidence.length > 0 && deepfakeConfigured ? 0.5 : 0;
    const blockchainTimestamp = request.evidence.length * 0.01; // ₹0.01 per item

    return {
        identityVerification,
        mlInference,
        llmAnalysis,
        deepfakeCheck,
        blockchainTimestamp,
        totalInr: identityVerification + mlInference + llmAnalysis + deepfakeCheck + blockchainTimestamp
    };
}

/**
 * Get claim by ID (for status checking)
 */
export async function getClaimById(claimId: string): Promise<ClaimVerifyResponse | null> {
    const claim = await claimsPersistence.getClaim(claimId);
    if (!claim) return null;

    return {
        claimId: claim.id,
        trustScore: claim.trustScore,
        recommendation: claim.recommendation,
        reasonCodes: (claim.reasonCodes ?? []) as ReasonCode[],
        riskSignals: (claim.riskSignals ?? []) as RiskSignal[],
        breakdown: {
            identityScore: claim.identityScore,
            integrityScore: claim.integrityScore,
            authenticityScore: claim.authenticityScore,
        },
        redFlags: claim.redFlags,
        aiAnalysis: claim.aiAnalysis,
        processingTimeMs: claim.processingTimeMs,
        costBreakdown: {
            identityVerification: 0,
            mlInference: 0,
            llmAnalysis: 0,
            deepfakeCheck: 0,
            blockchainTimestamp: 0,
            totalInr: 0,
        },
    };
}
