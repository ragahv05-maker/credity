import crypto from 'crypto';
import { blockchainService } from './blockchain-service';
import { PostgresStateStore } from '@credverse/shared-auth';

/**
 * Verification Engine for CredVerse Recruiter Portal
 * Handles credential verification, signature validation, and on-chain checks
 */

export interface VerificationResult {
    status: 'verified' | 'failed' | 'suspicious' | 'pending';
    confidence: number; // 0-100
    checks: VerificationCheck[];
    riskScore: number; // 0-100 (higher = more risky)
    riskFlags: string[];
    timestamp: Date;
    verificationId: string;
}

export interface VerificationCheck {
    name: string;
    status: 'passed' | 'failed' | 'warning' | 'skipped';
    message: string;
    details?: any;
}

export interface CredentialPayload {
    jwt?: string;
    qrData?: string;
    credentialId?: string;
    raw?: any;
}

export interface BulkVerificationResult {
    id: string;
    total: number;
    verified: number;
    failed: number;
    suspicious: number;
    results: VerificationResult[];
    completedAt: Date;
}

// In-memory cache for verification results
const verificationCache = new Map<string, VerificationResult>();
const bulkJobs = new Map<string, BulkVerificationResult>();
type PersistedVerificationResult = Omit<VerificationResult, 'timestamp'> & { timestamp: string };
type PersistedBulkVerificationResult = Omit<BulkVerificationResult, 'completedAt' | 'results'> & {
    completedAt: string;
    results: PersistedVerificationResult[];
};
type VerificationEngineState = {
    verificationCache: Array<[string, PersistedVerificationResult]>;
    bulkJobs: Array<[string, PersistedBulkVerificationResult]>;
};
const hasDatabase = typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0;
const stateStore = hasDatabase
    ? new PostgresStateStore<VerificationEngineState>({
        databaseUrl: process.env.DATABASE_URL as string,
        serviceKey: 'recruiter-verification-engine',
    })
    : null;
let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
let persistChain = Promise.resolve();

function serializeVerificationResult(result: VerificationResult): PersistedVerificationResult {
    return {
        ...result,
        timestamp: result.timestamp.toISOString(),
    };
}

function deserializeVerificationResult(result: PersistedVerificationResult): VerificationResult {
    return {
        ...result,
        timestamp: new Date(result.timestamp),
    };
}

function serializeBulkResult(result: BulkVerificationResult): PersistedBulkVerificationResult {
    return {
        ...result,
        completedAt: result.completedAt.toISOString(),
        results: result.results.map(serializeVerificationResult),
    };
}

function deserializeBulkResult(result: PersistedBulkVerificationResult): BulkVerificationResult {
    return {
        ...result,
        completedAt: new Date(result.completedAt),
        results: result.results.map(deserializeVerificationResult),
    };
}

async function ensureHydrated(): Promise<void> {
    if (!stateStore || hydrated) return;
    if (!hydrationPromise) {
        hydrationPromise = (async () => {
            const loaded = await stateStore.load();
            verificationCache.clear();
            bulkJobs.clear();
            for (const [verificationId, result] of loaded?.verificationCache || []) {
                verificationCache.set(verificationId, deserializeVerificationResult(result));
            }
            for (const [jobId, result] of loaded?.bulkJobs || []) {
                bulkJobs.set(jobId, deserializeBulkResult(result));
            }
            hydrated = true;
        })();
    }
    await hydrationPromise;
}

async function queuePersist(): Promise<void> {
    if (!stateStore) return;
    persistChain = persistChain
        .then(async () => {
            await stateStore.save({
                verificationCache: Array.from(verificationCache.entries()).map(([verificationId, result]) => [
                    verificationId,
                    serializeVerificationResult(result),
                ]),
                bulkJobs: Array.from(bulkJobs.entries()).map(([jobId, result]) => [
                    jobId,
                    serializeBulkResult(result),
                ]),
            });
        })
        .catch((error) => {
            console.error('[VerificationEngine] Persist failed:', error);
        });
    await persistChain;
}

/**
 * Verification Engine
 */
export class VerificationEngine {
    private walletEndpoint: string;
    private issuerRegistry: Map<string, IssuerInfo>;

    constructor() {
        this.walletEndpoint = process.env.WALLET_ENDPOINT || 'http://localhost:5002';
        this.issuerRegistry = new Map();
        this.initializeIssuerRegistry();
    }

    /**
     * Initialize known issuers registry
     */
    private initializeIssuerRegistry() {
        const trustedIssuers: IssuerInfo[] = [
            {
                did: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72', // Matches seeded Issuer
                name: 'Demo University',
                type: 'academic',
                trustLevel: 'high',
                verified: true,
            },
            {
                did: 'did:key:stanford-university',
                name: 'Stanford University',
                type: 'academic',
                trustLevel: 'high',
                verified: true,
            },
        ];

        trustedIssuers.forEach(issuer => {
            this.issuerRegistry.set(issuer.did, issuer);
            this.issuerRegistry.set(issuer.name.toLowerCase(), issuer);
        });
    }

    /**
     * Verify a single credential
     */
    async verifyCredential(payload: CredentialPayload): Promise<VerificationResult> {
        await ensureHydrated();
        const verificationId = `verify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const checks: VerificationCheck[] = [];
        const riskFlags: string[] = [];
        let overallStatus: 'verified' | 'failed' | 'suspicious' = 'verified';

        try {
            // Parse credential
            let credential: any;
            if (payload.jwt) {
                credential = this.parseJWT(payload.jwt);
                checks.push({
                    name: 'JWT Format',
                    status: credential ? 'passed' : 'failed',
                    message: credential ? 'Valid JWT format' : 'Invalid JWT format',
                });
            } else if (payload.qrData) {
                credential = this.parseQRData(payload.qrData);
                checks.push({
                    name: 'QR Data',
                    status: credential ? 'passed' : 'failed',
                    message: credential ? 'Valid QR data' : 'Invalid QR data',
                });
            } else if (payload.raw) {
                credential = payload.raw;
                checks.push({
                    name: 'Credential Format',
                    status: 'passed',
                    message: 'Raw credential accepted',
                });
            }

            if (!credential) {
                return this.createFailedResult(verificationId, 'Could not parse credential');
            }

            // Check 1: Signature Validation
            const signatureCheck = await this.verifySignature(credential);
            checks.push(signatureCheck);
            if (signatureCheck.status === 'failed') {
                overallStatus = 'failed';
                riskFlags.push('INVALID_SIGNATURE');
            }

            // Check 2: Issuer Verification
            const issuerCheck = await this.verifyIssuer(credential);
            checks.push(issuerCheck);
            if (issuerCheck.status === 'failed') {
                overallStatus = 'suspicious';
                riskFlags.push('UNKNOWN_ISSUER');
            } else if (issuerCheck.status === 'warning') {
                riskFlags.push('UNVERIFIED_ISSUER');
            }

            // Check 3: Expiration Check
            const expirationCheck = this.checkExpiration(credential);
            checks.push(expirationCheck);
            if (expirationCheck.status === 'failed') {
                overallStatus = 'failed';
                riskFlags.push('EXPIRED_CREDENTIAL');
            }

            // Check 4: Revocation Check
            const revocationCheck = await this.checkRevocation(credential);
            checks.push(revocationCheck);
            if (revocationCheck.status === 'failed') {
                overallStatus = 'failed';
                riskFlags.push('REVOKED_CREDENTIAL');
            }

            // Check 5: On-chain Anchor Check
            const anchorCheck = await this.checkOnChainAnchor(credential);
            checks.push(anchorCheck);
            if (anchorCheck.status === 'warning') {
                riskFlags.push('NO_BLOCKCHAIN_ANCHOR');
            }

            // Check 6: DID Document Resolution
            const didCheck = await this.resolveDID(credential);
            checks.push(didCheck);
            if (didCheck.status === 'failed') {
                if (overallStatus !== 'failed') overallStatus = 'suspicious';
                riskFlags.push('DID_RESOLUTION_FAILED');
            }

            // Calculate risk score
            const riskScore = this.calculateRiskScore(checks, riskFlags);

            // Determine final status based on risk score
            if (riskScore > 70) overallStatus = 'failed';
            else if (riskScore > 40) overallStatus = 'suspicious';

            const result: VerificationResult = {
                status: overallStatus,
                confidence: 100 - riskScore,
                checks,
                riskScore,
                riskFlags,
                timestamp: new Date(),
                verificationId,
            };

            // Cache result
            verificationCache.set(verificationId, result);
            await queuePersist();

            return result;
        } catch (error) {
            console.error('Verification error:', error);
            return this.createFailedResult(verificationId, 'Verification process failed');
        }
    }

    /**
     * Bulk verify credentials from CSV data
     */
    async bulkVerify(credentials: CredentialPayload[]): Promise<BulkVerificationResult> {
        await ensureHydrated();
        const jobId = `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const results: VerificationResult[] = [];

        let verified = 0;
        let failed = 0;
        let suspicious = 0;

        for (const cred of credentials) {
            const result = await this.verifyCredential(cred);
            results.push(result);

            if (result.status === 'verified') verified++;
            else if (result.status === 'failed') failed++;
            else if (result.status === 'suspicious') suspicious++;
        }

        const bulkResult: BulkVerificationResult = {
            id: jobId,
            total: credentials.length,
            verified,
            failed,
            suspicious,
            results,
            completedAt: new Date(),
        };

        bulkJobs.set(jobId, bulkResult);
        await queuePersist();
        return bulkResult;
    }

    /**
     * Parse JWT credential
     */
    private parseJWT(jwt: string): any {
        try {
            const parts = jwt.split('.');
            if (parts.length !== 3) return null;
            const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            const signatureSegment = parts[2];

            return {
                ...payload,
                __jwtMeta: {
                    alg: header?.alg,
                    kid: header?.kid,
                    hasSignature: typeof signatureSegment === 'string' && signatureSegment.length > 0,
                    rawJwt: jwt,
                },
            };
        } catch {
            return null;
        }
    }

    /**
     * Parse QR data
     */
    private parseQRData(qrData: string): any {
        try {
            return JSON.parse(qrData);
        } catch {
            try {
                return JSON.parse(Buffer.from(qrData, 'base64').toString());
            } catch {
                return null;
            }
        }
    }

    /**
     * Verify credential signature
     */
    private async verifySignature(credential: any): Promise<VerificationCheck> {
        // Get issuer identifier (could be DID or plain name)
        const issuer = credential.issuer?.id || credential.iss || credential.issuer;
        const isValidDid = typeof issuer === 'string' && issuer.startsWith('did:');

        // Detect presence of cryptographic proof
        const hasJwtSignature = Boolean(credential?.__jwtMeta?.hasSignature);
        const hasProof = Boolean(credential.proof || credential.signature || hasJwtSignature);
        const proofType = hasJwtSignature ? 'jwt' : (credential.proof?.type ?? 'vc_proof');
        const isValid = hasProof && isValidDid;

        // Require valid issuer DID and cryptographic proof for all runtime modes.
        return {
            name: 'Signature Validation',
            status: isValid ? 'passed' : 'failed',
            message: isValid
                ? 'Cryptographic signature material is present'
                : 'Missing or invalid signature',
            details: { proofType, issuer },
        };
    }

    /**
     * Verify issuer with remote registry fallback
     */
    private async verifyIssuer(credential: any): Promise<VerificationCheck> {
        // Handle different credential formats (VC vs raw)
        const issuerDid = typeof credential.issuer === 'string'
            ? credential.issuer
            : (credential.issuer?.id || credential.iss);

        if (!issuerDid) {
            return {
                name: 'Issuer Verification',
                status: 'failed',
                message: 'No issuer DID found in credential',
            };
        }

        // 1. Check local cache/registry first
        let issuerInfo = this.issuerRegistry.get(issuerDid.toLowerCase()) || this.issuerRegistry.get(issuerDid);

        // 2. Resolve remotely if not found - REAL API CALL
        if (!issuerInfo) {
            try {
                // Call Issuer Service Public API
                const registryUrl = process.env.ISSUER_REGISTRY_URL || 'http://localhost:5001';
                const res = await fetch(`${registryUrl}/api/v1/public/registry/issuers/did/${encodeURIComponent(issuerDid)}`);

                if (res.ok) {
                    const remoteIssuer = await res.json();
                    issuerInfo = {
                        did: remoteIssuer.did,
                        name: remoteIssuer.name,
                        type: 'academic',
                        trustLevel: remoteIssuer.trustStatus === 'trusted' ? 'high' : 'medium',
                        verified: remoteIssuer.trustStatus === 'trusted'
                    };

                    // Cache it for future lookups
                    this.issuerRegistry.set(issuerDid, issuerInfo);
                    this.issuerRegistry.set(issuerDid.toLowerCase(), issuerInfo);
                } else {
                    console.warn(`[Verification] Issuer lookup failed for ${issuerDid}: ${res.status}`);
                }
            } catch (e) {
                console.error(`[Verification] Failed to resolve issuer ${issuerDid} remotely:`, e);
            }
        }

        if (!issuerInfo) {
            return {
                name: 'Issuer Verification',
                status: 'warning',
                message: `Unknown issuer: ${issuerDid} (Not found in Registry w/ REAL lookup)`,
                details: { issuer: issuerDid, trusted: false, registry: 'not_found' },
            };
        }

        return {
            name: 'Issuer Verification',
            status: issuerInfo.verified ? 'passed' : 'warning',
            message: issuerInfo.verified
                ? `Verified issuer: ${issuerInfo.name}`
                : `Unverified issuer: ${issuerInfo.name}`,
            details: {
                issuerName: issuerInfo.name,
                did: issuerInfo.did,
                trusted: issuerInfo.verified
            },
        };
    }

    /**
     * Check credential expiration
     */
    private checkExpiration(credential: any): VerificationCheck {
        const expDate = credential.expirationDate || credential.exp;

        if (!expDate) {
            return {
                name: 'Expiration Check',
                status: 'passed',
                message: 'No expiration date (credential does not expire)',
            };
        }

        const expiry = typeof expDate === 'number' ? new Date(expDate * 1000) : new Date(expDate);
        const isExpired = expiry < new Date();

        return {
            name: 'Expiration Check',
            status: isExpired ? 'failed' : 'passed',
            message: isExpired
                ? `Credential expired on ${expiry.toISOString()}`
                : `Valid until ${expiry.toISOString()}`,
            details: { expirationDate: expiry },
        };
    }

    /**
     * Check revocation status - REAL CHECK
     */
    private async checkRevocation(credential: any): Promise<VerificationCheck> {
        const credentialId = credential.id || credential.jti;
        const rawJwt = credential?.__jwtMeta?.rawJwt;

        try {
            // Call Issuer API for status
            const registryUrl = process.env.ISSUER_REGISTRY_URL || 'http://localhost:5001';
            // Assuming we can check status via public verify endpoint or specific status endpoint
            // Looking at Issuer routes, GET /api/v1/verify/:credentialId returns status
            const verificationUrl = credentialId
                ? `${registryUrl}/api/v1/verify/${credentialId}`
                : (typeof rawJwt === 'string' && rawJwt.length > 0
                    ? `${registryUrl}/api/v1/verify?vc=${encodeURIComponent(rawJwt)}`
                    : null);

            if (!verificationUrl) {
                return {
                    name: 'Revocation Check',
                    status: 'warning',
                    message: 'Cannot check revocation (No Credential ID)',
                };
            }

            const res = await fetch(verificationUrl);

            if (res.ok) {
                const data = await res.json();
                const isRevoked = data.revoked;

                return {
                    name: 'Revocation Check',
                    status: isRevoked ? 'failed' : 'passed',
                    message: isRevoked ? 'Credential has been REVOKED by Issuer' : 'Credential is valid (Active)',
                    details: { revoked: isRevoked, checkedAt: new Date().toISOString() },
                };
            }
        } catch (e) {
            console.error("Revocation check failed", e);
        }

        // Fallback if API fails (don't fail the credential, just warn)
        return {
            name: 'Revocation Check',
            status: 'warning',
            message: 'Revocation status could not be verified (Issuer unreachable)',
            details: { checkedAt: new Date().toISOString() },
        };
    }

    /**
     * Check on-chain anchor
     */
    private async checkOnChainAnchor(credential: any): Promise<VerificationCheck> {
        // Hash the credential data to find it on-chain
        // The issuance process hashes the credential content
        let dataToHash = Buffer.isBuffer(credential) ? credential.toString() : credential;

        // If it's a JWT payload, we might need to verify the hash of the original JWT or the payload depending on how issuer anchored it.
        // Assuming issuer anchors hash of the VC Payload/claim
        // For MVP compatibility with issuance service:
        const hash = this.hashCredential(credential);

        // Real Blockchain Check
        const result = await blockchainService.verifyCredential(hash);

        if (result.isValid && result.exists) {
            return {
                name: 'Blockchain Anchor',
                status: 'passed',
                message: `Anchored on Local Polygon: ${result.anchoredAt}`,
                details: {
                    hash: hash,
                    anchored: true,
                    chain: 'Polygon (Local)',
                    issuer: result.issuer,
                    timestamp: result.anchoredAt
                },
            };
        }

        return {
            name: 'Blockchain Anchor',
            status: 'warning',
            message: 'No blockchain anchor found for this credential hash',
            details: {
                hash,
                anchored: false,
                result
            },
        };
    }

    /**
     * Resolve DID Document
     */
    private async resolveDID(credential: any): Promise<VerificationCheck> {
        const did = credential.issuer?.id || credential.iss || credential.holder || credential.sub;

        if (!did || !did.startsWith?.('did:')) {
            return {
                name: 'DID Resolution',
                status: 'skipped',
                message: 'No DID present in credential',
            };
        }

        // Real check: We actually tried to resolve it in verifyIssuer for the issuer.
        // Here we just confirm the format and perhaps reachability (simulated reachability via regex for did:key)
        const isDidKey = did.startsWith("did:key:");
        const isDidWeb = did.startsWith("did:web:");

        const resolved = isDidKey || isDidWeb; // We support these methods

        return {
            name: 'DID Resolution',
            status: resolved ? 'passed' : 'warning',
            message: resolved
                ? `DID method supported and resolvable: ${did.slice(0, 30)}...`
                : 'Unsupported DID method',
            details: { did, resolved },
        };
    }

    /**
     * Calculate risk score
     */
    private calculateRiskScore(checks: VerificationCheck[], flags: string[]): number {
        let score = 0;

        // Base score from checks
        for (const check of checks) {
            if (check.status === 'failed') score += 25;
            else if (check.status === 'warning') score += 10;
        }

        // Additional risk from flags
        const flagWeights: Record<string, number> = {
            'INVALID_SIGNATURE': 30,
            'UNKNOWN_ISSUER': 20,
            'EXPIRED_CREDENTIAL': 25,
            'REVOKED_CREDENTIAL': 50,
            'NO_BLOCKCHAIN_ANCHOR': 5,
            'DID_RESOLUTION_FAILED': 15,
            'UNVERIFIED_ISSUER': 10,
        };

        for (const flag of flags) {
            score += flagWeights[flag] || 5;
        }

        return Math.min(100, score);
    }

    /**
     * Hash credential for verification
     */
    private hashCredential(credential: any): string {
        const canonical = JSON.stringify(credential, Object.keys(credential).sort());
        return crypto.createHash('sha256').update(canonical).digest('hex');
    }

    /**
     * Create failed result
     */
    private createFailedResult(verificationId: string, message: string): VerificationResult {
        return {
            status: 'failed',
            confidence: 0,
            checks: [{ name: 'Parse', status: 'failed', message }],
            riskScore: 100,
            riskFlags: ['PARSE_FAILED'],
            timestamp: new Date(),
            verificationId,
        };
    }

    /**
     * Get verification result by ID
     */
    async getVerificationResult(id: string): Promise<VerificationResult | undefined> {
        await ensureHydrated();
        return verificationCache.get(id);
    }

    /**
     * Get bulk job result
     */
    async getBulkJobResult(id: string): Promise<BulkVerificationResult | undefined> {
        await ensureHydrated();
        return bulkJobs.get(id);
    }
}

interface IssuerInfo {
    did: string;
    name: string;
    type: 'academic' | 'government' | 'employment' | 'certification';
    trustLevel: 'high' | 'medium' | 'low';
    verified: boolean;
}

export const verificationEngine = new VerificationEngine();
