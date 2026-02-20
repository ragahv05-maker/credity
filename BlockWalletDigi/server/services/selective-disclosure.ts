/**
 * Selective Disclosure Service for CredVerse Wallet
 * Implements field-level disclosure for credentials
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SelectiveDisclosureRequest {
    credentialId: string;
    requestedFields: string[];
    requesterDID?: string;
    purpose: string;
    expiryMinutes?: number;
}

export interface DisclosureToken {
    id: string;
    credentialId: string;
    disclosedData: Record<string, any>;
    hiddenFields: string[];
    proof: {
        type: string;
        created: string;
        disclosureDigest: string;
    };
    expiry: Date;
    requesterDID?: string;
    purpose: string;
}

export interface ConsentLog {
    id: string;
    credentialId: string;
    disclosedFields: string[];
    requesterDID?: string;
    requesterName?: string;
    purpose: string;
    timestamp: Date;
    consentGiven: boolean;
    ipAddress?: string;
    userAgent?: string;
}

// ---------------------------------------------------------------------------
// File-backed persistence for consent logs and disclosure tokens
// ---------------------------------------------------------------------------
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const CONSENT_LOGS_FILE = path.join(DATA_DIR, 'consent-logs.json');
const DISCLOSURE_TOKENS_FILE = path.join(DATA_DIR, 'disclosure-tokens.json');

function ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function loadConsentLogs(): ConsentLog[] {
    try {
        const raw = fs.readFileSync(CONSENT_LOGS_FILE, 'utf8');
        const arr = JSON.parse(raw) as any[];
        return arr.map((l) => ({ ...l, timestamp: new Date(l.timestamp) }));
    } catch {
        return [];
    }
}

function saveConsentLogs(logs: ConsentLog[]): void {
    try {
        ensureDataDir();
        fs.writeFileSync(CONSENT_LOGS_FILE, JSON.stringify(logs, null, 2));
    } catch (err) {
        console.error('[selective-disclosure] Failed to persist consent logs:', err);
    }
}

function loadDisclosureTokens(): Map<string, DisclosureToken> {
    try {
        const raw = fs.readFileSync(DISCLOSURE_TOKENS_FILE, 'utf8');
        const obj = JSON.parse(raw) as Record<string, any>;
        const map = new Map<string, DisclosureToken>();
        for (const [k, v] of Object.entries(obj)) {
            map.set(k, { ...v, expiry: new Date(v.expiry) });
        }
        return map;
    } catch {
        return new Map();
    }
}

function saveDisclosureTokens(tokens: Map<string, DisclosureToken>): void {
    try {
        ensureDataDir();
        const obj: Record<string, DisclosureToken> = {};
        for (const [k, v] of tokens.entries()) {
            obj[k] = v;
        }
        fs.writeFileSync(DISCLOSURE_TOKENS_FILE, JSON.stringify(obj, null, 2));
    } catch (err) {
        console.error('[selective-disclosure] Failed to persist disclosure tokens:', err);
    }
}

// Load persisted state on module init
const disclosureTokens = loadDisclosureTokens();
const consentLogs: ConsentLog[] = loadConsentLogs();

/**
 * Selective Disclosure Service
 */
export class SelectiveDisclosureService {
    /**
     * Check if a field path exists in an object
     */
    private getFieldValue(obj: any, path: string): any {
        const parts = path.split('.');
        let current = obj;

        for (const part of parts) {
            if (current === undefined || current === null) return undefined;
            current = current[part];
        }

        return current;
    }

    /**
     * Set a field value in an object using dot notation path
     */
    private setFieldValue(obj: any, path: string, value: any): void {
        const parts = path.split('.');
        let current = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            if (!(parts[i] in current)) {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }

        current[parts[parts.length - 1]] = value;
    }

    /**
     * Get all field paths from a credential
     */
    getCredentialFields(credentialData: any): string[] {
        const fields: string[] = [];

        const traverse = (obj: any, prefix: string = '') => {
            for (const key in obj) {
                const path = prefix ? `${prefix}.${key}` : key;

                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    traverse(obj[key], path);
                } else {
                    fields.push(path);
                }
            }
        };

        traverse(credentialData);
        return fields;
    }

    /**
     * Create a selective disclosure token
     */
    createDisclosureToken(
        credentialId: string,
        fullCredentialData: any,
        request: SelectiveDisclosureRequest
    ): DisclosureToken {
        const allFields = this.getCredentialFields(fullCredentialData);
        const disclosedData: Record<string, any> = {};
        const hiddenFields: string[] = [];

        // Separate disclosed and hidden fields
        for (const field of allFields) {
            if (request.requestedFields.includes(field)) {
                const value = this.getFieldValue(fullCredentialData, field);
                this.setFieldValue(disclosedData, field, value);
            } else {
                hiddenFields.push(field);
            }
        }

        // Create disclosure digest (hash of what's being disclosed)
        const disclosureDigest = this.hashDisclosure(disclosedData);

        const token: DisclosureToken = {
            id: `disclosure-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            credentialId,
            disclosedData,
            hiddenFields,
            proof: {
                type: 'SelectiveDisclosure2023',
                created: new Date().toISOString(),
                disclosureDigest,
            },
            expiry: new Date(Date.now() + (request.expiryMinutes || 30) * 60 * 1000),
            requesterDID: request.requesterDID,
            purpose: request.purpose,
        };

        disclosureTokens.set(token.id, token);
        saveDisclosureTokens(disclosureTokens);
        return token;
    }

    /**
     * Log user consent for disclosure
     */
    logConsent(
        credentialId: string,
        disclosedFields: string[],
        consentGiven: boolean,
        metadata: {
            requesterDID?: string;
            requesterName?: string;
            purpose: string;
            ipAddress?: string;
            userAgent?: string;
        }
    ): ConsentLog {
        const log: ConsentLog = {
            id: `consent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            credentialId,
            disclosedFields,
            requesterDID: metadata.requesterDID,
            requesterName: metadata.requesterName,
            purpose: metadata.purpose,
            timestamp: new Date(),
            consentGiven,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
        };

        consentLogs.push(log);
        saveConsentLogs(consentLogs);
        return log;
    }

    /**
     * Get consent history for a credential
     */
    getConsentHistory(credentialId: string): ConsentLog[] {
        return consentLogs
            .filter(log => log.credentialId === credentialId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    /**
     * Validate a disclosure token
     */
    validateDisclosureToken(tokenId: string): {
        valid: boolean;
        expired?: boolean;
        token?: DisclosureToken;
        error?: string;
    } {
        const token = disclosureTokens.get(tokenId);

        if (!token) {
            return { valid: false, error: 'Token not found' };
        }

        if (new Date() > token.expiry) {
            return { valid: false, expired: true, error: 'Token expired' };
        }

        return { valid: true, token };
    }

    /**
     * Revoke a disclosure token
     */
    revokeDisclosureToken(tokenId: string): boolean {
        const deleted = disclosureTokens.delete(tokenId);
        if (deleted) saveDisclosureTokens(disclosureTokens);
        return deleted;
    }

    /**
     * Hash the disclosed data for integrity verification
     */
    private hashDisclosure(data: any): string {
        const crypto = require('crypto');
        const canonical = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(canonical).digest('hex');
    }

    /**
     * Common credential field categories for UI
     */
    getFieldCategories(): Record<string, string[]> {
        return {
            'Basic Identity': [
                'credentialSubject.name',
                'credentialSubject.givenName',
                'credentialSubject.familyName',
                'credentialSubject.id',
            ],
            'Contact Information': [
                'credentialSubject.email',
                'credentialSubject.phone',
                'credentialSubject.address',
            ],
            'Academic': [
                'credentialSubject.degree',
                'credentialSubject.degreeName',
                'credentialSubject.major',
                'credentialSubject.graduationDate',
                'credentialSubject.gpa',
                'credentialSubject.honors',
            ],
            'Employment': [
                'credentialSubject.employer',
                'credentialSubject.jobTitle',
                'credentialSubject.startDate',
                'credentialSubject.endDate',
                'credentialSubject.department',
            ],
            'Verification': [
                'issuer',
                'issuanceDate',
                'expirationDate',
                'credentialStatus',
            ],
        };
    }

    /**
     * Suggest minimum required fields for common purposes
     */
    getSuggestedFieldsForPurpose(purpose: string): string[] {
        const purposeFields: Record<string, string[]> = {
            'employment_verification': [
                'credentialSubject.name',
                'credentialSubject.degree',
                'credentialSubject.graduationDate',
                'issuer',
            ],
            'background_check': [
                'credentialSubject.name',
                'credentialSubject.id',
                'issuer',
                'issuanceDate',
            ],
            'academic_record': [
                'credentialSubject.name',
                'credentialSubject.degree',
                'credentialSubject.major',
                'credentialSubject.gpa',
                'credentialSubject.graduationDate',
            ],
            'identity_proof': [
                'credentialSubject.name',
                'credentialSubject.id',
            ],
        };

        return purposeFields[purpose] || ['credentialSubject.name', 'issuer'];
    }
}

export const selectiveDisclosureService = new SelectiveDisclosureService();
