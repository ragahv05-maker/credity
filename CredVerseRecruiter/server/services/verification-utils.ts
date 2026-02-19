import { signWebhook } from '@credverse/shared-auth';
import type {
    CandidateVerificationSummary,
    ReasonCode,
    VerificationDecision,
    VerificationEvidence,
    VerificationResultContract,
    WorkScoreBreakdown,
} from '@credverse/shared-auth';

const MAX_JWT_BYTES = 16 * 1024;

export function mapCredentialValidity(
    status: 'verified' | 'failed' | 'suspicious' | 'pending',
): VerificationResultContract['credential_validity'] {
    if (status === 'verified') return 'valid';
    if (status === 'failed') return 'invalid';
    return 'unknown';
}

export function mapStatusValidity(riskFlags: string[]): VerificationResultContract['status_validity'] {
    if (riskFlags.includes('REVOKED_CREDENTIAL')) return 'revoked';
    return 'active';
}

export function mapAnchorValidity(riskFlags: string[]): VerificationResultContract['anchor_validity'] {
    if (riskFlags.includes('NO_BLOCKCHAIN_ANCHOR')) return 'pending';
    return 'anchored';
}

export function mapDecision(recommendation: string | undefined): VerificationResultContract['decision'] {
    switch (recommendation) {
        case 'accept':
            return 'approve';
        case 'reject':
            return 'reject';
        case 'review':
            return 'review';
        default:
            return 'investigate';
    }
}


export function isUnsignedOrScannedCredential(credentialData: Record<string, unknown> | null): boolean {
    if (!credentialData) return false;
    const hasCryptographicProof = Boolean((credentialData as any).proof || (credentialData as any).signature);
    if (!hasCryptographicProof) return true;

    const scanHints = [
        (credentialData as any).scanned,
        (credentialData as any).scanResult,
        (credentialData as any).scanSource,
        (credentialData as any).documentScan,
        (credentialData as any).ocr,
    ];

    return scanHints.some((value) => {
        if (value === true) return true;
        if (typeof value === 'string') {
            const lowered = value.toLowerCase();
            return lowered.includes('scan') || lowered.includes('ocr');
        }
        return false;
    });
}

export function applyLockedVerificationDecisionPolicy(input: {
    riskFlags: string[];
    recommendation?: string;
    credentialData: Record<string, unknown> | null;
}): VerificationResultContract['decision'] {
    if (input.riskFlags.includes('INVALID_SIGNATURE')) {
        return 'reject';
    }
    if (isUnsignedOrScannedCredential(input.credentialData)) {
        return 'review';
    }
    return mapDecision(input.recommendation);
}

export function toCandidateDecision(decision: VerificationResultContract['decision']): VerificationDecision {
    return decision;
}

export function buildCandidateSummaryContract(input: {
    candidateId: string;
    verificationResult: { confidence: number; riskScore: number; timestamp: Date; checks: Array<{ name: string; status: string }>; riskFlags: string[] };
    decision: VerificationResultContract['decision'];
    issuer?: string;
}): CandidateVerificationSummary {
    const confidence = Number(Math.max(0, Math.min(1, input.verificationResult.confidence)).toFixed(2));
    const risk_score = Number((Math.max(0, Math.min(100, input.verificationResult.riskScore)) / 100).toFixed(2));
    const score = Math.max(0, Math.min(1000, Math.round(confidence * 1000)));

    const breakdown: WorkScoreBreakdown[] = input.verificationResult.checks.map((check) => ({
        category: String(check.name || 'verification').toLowerCase().replace(/\s+/g, '_'),
        weight: Number((1 / Math.max(input.verificationResult.checks.length, 1)).toFixed(2)),
        score: check.status === 'passed' ? 100 : check.status === 'warning' ? 60 : 20,
        weighted_score: check.status === 'passed' ? 100 : check.status === 'warning' ? 60 : 20,
        event_count: 1,
    }));

    const evidence: VerificationEvidence[] = [
        {
            id: `verification-${input.verificationResult.timestamp.getTime()}`,
            type: 'external_check',
            issuer: input.issuer,
            metadata: {
                risk_flags: input.verificationResult.riskFlags,
            },
            verified_at: input.verificationResult.timestamp.toISOString(),
        },
    ];

    return {
        candidate_id: input.candidateId,
        decision: toCandidateDecision(input.decision),
        confidence,
        risk_score,
        reason_codes: input.verificationResult.riskFlags as ReasonCode[],
        work_score: {
            score,
            max_score: 1000,
            computed_at: input.verificationResult.timestamp.toISOString(),
            breakdown,
        },
        evidence,
    };
}

export async function emitVerificationWebhook(event: string, payload: Record<string, unknown>): Promise<void> {
    const targetUrl = process.env.VERIFICATION_WEBHOOK_URL;
    if (!targetUrl) return;

    const secret = process.env.VERIFICATION_WEBHOOK_SECRET || process.env.CREDENTIAL_WEBHOOK_SECRET;
    const body = { event, ...payload };
    const signed = secret ? signWebhook(body, secret) : null;

    await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(signed
                ? {
                    'X-Webhook-Timestamp': signed.timestamp,
                    'X-Webhook-Signature': `sha256=${signed.signature}`,
                }
                : {}),
        },
        body: signed ? signed.payload : JSON.stringify(body),
    });
}

export function parseJwtPayloadSafely(jwt: string): Record<string, unknown> {
    if (Buffer.byteLength(jwt, 'utf8') > MAX_JWT_BYTES) {
        throw new Error('JWT payload is too large');
    }
    const parts = jwt.split('.');
    if (parts.length < 2) {
        throw new Error('Invalid JWT format');
    }
    const decoded = Buffer.from(parts[1], 'base64url').toString();
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JWT payload');
    }
    return parsed as Record<string, unknown>;
}

export function readString(value: unknown, fallback = 'Unknown'): string {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

export function readCredentialType(credentialData: Record<string, unknown> | null): string {
    if (!credentialData) return 'Unknown';
    const typeValue = credentialData.type;
    if (Array.isArray(typeValue)) {
        return readString(typeValue[0], 'Unknown');
    }
    return readString(typeValue, 'Unknown');
}

export function readSubjectName(credentialData: Record<string, unknown> | null): string {
    if (!credentialData) return 'Unknown';
    const subjectValue = credentialData.credentialSubject;
    if (!subjectValue || typeof subjectValue !== 'object') {
        return 'Unknown';
    }
    return readString((subjectValue as Record<string, unknown>).name, 'Unknown');
}

export function readIssuer(credentialData: Record<string, unknown> | null): string {
    if (!credentialData) return 'Unknown';
    const issuerValue = credentialData.issuer;
    if (typeof issuerValue === 'string') return readString(issuerValue, 'Unknown');
    if (!issuerValue || typeof issuerValue !== 'object') return 'Unknown';
    const issuerObject = issuerValue as Record<string, unknown>;
    return readString(issuerObject.name ?? issuerObject.id, 'Unknown');
}
