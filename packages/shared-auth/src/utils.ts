/**
 * Shared utility functions
 */

export function parseJwtPayloadSafely(token: string): Record<string, unknown> {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT format');
        }
        const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
        return JSON.parse(payload);
    } catch {
        // Return empty object or throw based on preference, but here we return basic info or throw specific
        throw new Error('Failed to parse JWT payload');
    }
}

export function readCredentialType(data: any): string {
    const types = data?.type || data?.vc?.type;
    if (Array.isArray(types) && types.length > 0) {
        return types[types.length - 1]; // usually the most specific type
    }
    return 'VerifiableCredential';
}

export function readIssuer(data: any): string {
    const issuer = data?.issuer || data?.vc?.issuer;
    if (typeof issuer === 'string') return issuer;
    if (typeof issuer === 'object' && issuer?.id) return issuer.id;
    return 'Unknown Issuer';
}

export function readSubjectName(data: any): string {
    const subject = data?.credentialSubject || data?.vc?.credentialSubject;
    if (subject?.name) return subject.name;
    if (subject?.givenName && subject?.familyName) return `${subject.givenName} ${subject.familyName}`;
    if (subject?.id) return subject.id;
    return 'Unknown Subject';
}

// Maps verification engine status to legacy recommendation strings
export function mapDecisionToLegacyRecommendation(decision: 'approve' | 'reject' | 'review'): 'approve' | 'reject' | 'review' | 'investigate' {
    if (decision === 'reject') return 'reject';
    if (decision === 'review') return 'review';
    return 'approve';
}

export function deriveDecision(
    status: string,
    riskFlags: string[],
    fraudRecommendation: string,
    riskScore: number
): 'approve' | 'reject' | 'review' {
    if (status === 'failed' || status === 'revoked') return 'reject';
    if (riskFlags.includes('INVALID_SIGNATURE')) return 'reject';
    if (riskFlags.includes('REVOKED_CREDENTIAL')) return 'reject';

    if (fraudRecommendation === 'reject') return 'reject';
    if (fraudRecommendation === 'review' || riskScore > 50) return 'review';

    if (status === 'verified') return 'approve';
    return 'review'; // default fallback
}

export function mapCredentialValidity(status: string): 'valid' | 'invalid' | 'unknown' {
    if (status === 'verified') return 'valid';
    if (status === 'failed' || status === 'revoked') return 'invalid';
    return 'unknown';
}

export function mapStatusValidity(riskFlags: string[]): 'active' | 'revoked' | 'unknown' {
    if (riskFlags.includes('REVOKED_CREDENTIAL')) return 'revoked';
    if (riskFlags.length === 0) return 'active'; // Simplified
    return 'active';
}

export function mapAnchorValidity(riskFlags: string[]): 'anchored' | 'pending' | 'unknown' | 'invalid' {
    if (riskFlags.includes('ANCHOR_MISSING')) return 'invalid'; // or pending depending on context
    return 'anchored';
}

export function mapDecision(recommendation: string): 'approve' | 'reject' | 'review' {
    if (recommendation === 'reject') return 'reject';
    if (recommendation === 'investigate') return 'review';
    if (recommendation === 'review') return 'review';
    return 'approve';
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
    timestamp: Date;
    verifiedBy: string;
}
