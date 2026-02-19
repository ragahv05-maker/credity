import crypto from 'crypto';

/**
 * DigiLocker Integration Service
 * 
 * Official DigiLocker API Documentation: https://partners.digitallocker.gov.in/
 * 
 * IMPORTANT: To use real DigiLocker API, you need to register as a partner at:
 * https://partners.digitallocker.gov.in/
 * 
 * After registration, you'll receive:
 * - Client ID (DIGILOCKER_CLIENT_ID)
 * - Client Secret (DIGILOCKER_CLIENT_SECRET)
 */

// DigiLocker API Endpoints
const DIGILOCKER_CONFIG = {
    // Production endpoints
    authorizationUrl: 'https://api.digitallocker.gov.in/public/oauth2/1/authorize',
    tokenUrl: 'https://api.digitallocker.gov.in/public/oauth2/1/token',
    documentsUrl: 'https://api.digitallocker.gov.in/public/oauth2/1/files/issued',
    userInfoUrl: 'https://api.digitallocker.gov.in/public/oauth2/1/user',
    pullDocUrl: 'https://api.digitallocker.gov.in/public/oauth2/3/pull/uri',

    // Sandbox endpoints (for testing)
    sandboxAuthUrl: 'https://apisetu.gov.in/digilocker/authorize',
    sandboxTokenUrl: 'https://apisetu.gov.in/digilocker/token',

    // Your app's callback URL
    redirectUri: process.env.DIGILOCKER_REDIRECT_URI || 'http://localhost:5002/api/digilocker/callback',

    // Scopes for document access
    scopes: ['openid', 'profile', 'email', 'aadhaar', 'pan', 'dl', 'classes10', 'classes12'],
};

interface DigiLockerTokens {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    digilocker_id?: string;
}

interface DigiLockerDocument {
    uri: string;
    doctype: string;
    name: string;
    description: string;
    issuer: string;
    issuerid: string;
    date: string;
    mime: string;
    size?: number;
}

interface DigiLockerUser {
    digilockerid: string;
    name: string;
    dob?: string;
    gender?: string;
    eaadhaar?: string;
    mobile?: string;
}

// In-memory session storage (use Redis in production)
const authSessions = new Map<string, {
    codeVerifier: string;
    state: string;
    createdAt: number;
    userId: number;
}>();

const tokenStorage = new Map<number, DigiLockerTokens>();

/**
 * DigiLocker Service for OAuth and document fetching
 */
export class DigiLockerService {
    private clientId: string;
    private clientSecret: string;
    private useSandbox: boolean;
    private isConfigured: boolean;
    private demoMode: boolean;

    constructor() {
        const configuredClientId = process.env.DIGILOCKER_CLIENT_ID || '';
        const configuredClientSecret = process.env.DIGILOCKER_CLIENT_SECRET || '';
        const allowDemoRoutes =
            process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEMO_ROUTES === 'true';

        this.isConfigured = !!(configuredClientId && configuredClientSecret);
        this.demoMode = !this.isConfigured && allowDemoRoutes;
        this.clientId = this.isConfigured ? configuredClientId : (this.demoMode ? 'demo_client_id' : '');
        this.clientSecret = this.isConfigured ? configuredClientSecret : (this.demoMode ? 'demo_client_secret' : '');
        this.useSandbox = process.env.DIGILOCKER_SANDBOX === 'true';

        if (!this.isConfigured && !this.demoMode) {
            console.warn('[DigiLocker] Credentials are not configured. DigiLocker operations are disabled.');
        }
    }

    /**
     * Generate PKCE code verifier and challenge
     */
    private generatePKCE(): { codeVerifier: string; codeChallenge: string } {
        const codeVerifier = crypto.randomBytes(32).toString('base64url');
        const codeChallenge = crypto
            .createHash('sha256')
            .update(codeVerifier)
            .digest('base64url');
        return { codeVerifier, codeChallenge };
    }

    /**
     * Generate a secure state parameter
     */
    private generateState(): string {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Get authorization URL for DigiLocker OAuth flow
     */
    getAuthorizationUrl(userId: number): { url: string; state: string } {
        if (!this.isConfigured && !this.demoMode) {
            throw new Error('DigiLocker credentials are not configured');
        }

        const { codeVerifier, codeChallenge } = this.generatePKCE();
        const state = this.generateState();

        // Store session for callback verification
        authSessions.set(state, {
            codeVerifier,
            state,
            createdAt: Date.now(),
            userId,
        });

        // Clean up old sessions (older than 10 minutes)
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        authSessions.forEach((session, key) => {
            if (session.createdAt < tenMinutesAgo) {
                authSessions.delete(key);
            }
        });

        const baseUrl = this.useSandbox
            ? DIGILOCKER_CONFIG.sandboxAuthUrl
            : DIGILOCKER_CONFIG.authorizationUrl;

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.clientId,
            redirect_uri: DIGILOCKER_CONFIG.redirectUri,
            state,
            scope: DIGILOCKER_CONFIG.scopes.join(' '),
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        });

        return {
            url: `${baseUrl}?${params.toString()}`,
            state,
        };
    }

    /**
     * Exchange authorization code for tokens
     */
    async exchangeCodeForTokens(code: string, state: string): Promise<DigiLockerTokens> {
        const session = authSessions.get(state);
        if (!session) {
            throw new Error('Invalid or expired session');
        }

        const tokenUrl = this.useSandbox
            ? DIGILOCKER_CONFIG.sandboxTokenUrl
            : DIGILOCKER_CONFIG.tokenUrl;

        // For demo mode, simulate token response
        if (this.demoMode) {
            console.log('[DigiLocker] Demo mode - simulating token exchange');
            const demoTokens: DigiLockerTokens = {
                access_token: `demo_access_token_${crypto.randomBytes(16).toString('hex')}`,
                refresh_token: `demo_refresh_token_${crypto.randomBytes(16).toString('hex')}`,
                expires_in: 3600,
                token_type: 'Bearer',
                digilocker_id: `DL-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
            };
            tokenStorage.set(session.userId, demoTokens);
            authSessions.delete(state);
            return demoTokens;
        }

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: DIGILOCKER_CONFIG.redirectUri,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code_verifier: session.codeVerifier,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token exchange failed: ${error}`);
        }

        const tokens: DigiLockerTokens = await response.json();
        tokenStorage.set(session.userId, tokens);
        authSessions.delete(state);

        return tokens;
    }

    /**
     * Get user profile from DigiLocker
     */
    async getUserInfo(userId: number): Promise<DigiLockerUser> {
        const tokens = tokenStorage.get(userId);
        if (!tokens) {
            throw new Error('User not authenticated with DigiLocker');
        }

        // Demo mode
        if (this.demoMode) {
            return {
                digilockerid: tokens.digilocker_id || 'DL-DEMO123',
                name: 'Demo User',
                dob: '1990-01-15',
                gender: 'M',
                mobile: '9876543210',
            };
        }

        const response = await fetch(DIGILOCKER_CONFIG.userInfoUrl, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        return response.json();
    }

    /**
     * List all issued documents from DigiLocker
     */
    async listDocuments(userId: number): Promise<DigiLockerDocument[]> {
        const tokens = tokenStorage.get(userId);
        if (!tokens) {
            throw new Error('User not authenticated with DigiLocker');
        }

        // Demo mode - return sample documents
        if (this.demoMode) {
            return [
                {
                    uri: 'in.gov.uidai-ADHAR-XXXXXXXX1234',
                    doctype: 'ADHAR',
                    name: 'Aadhaar Card',
                    description: 'Unique Identification Authority of India',
                    issuer: 'UIDAI',
                    issuerid: 'in.gov.uidai',
                    date: '2020-05-15',
                    mime: 'application/pdf',
                },
                {
                    uri: 'in.gov.cbdt-PAN-ABCDE1234F',
                    doctype: 'PAN',
                    name: 'PAN Card',
                    description: 'Permanent Account Number',
                    issuer: 'Income Tax Department',
                    issuerid: 'in.gov.cbdt',
                    date: '2018-03-20',
                    mime: 'application/pdf',
                },
                {
                    uri: 'in.gov.transport-DL-DL1234567890123',
                    doctype: 'DRVLC',
                    name: 'Driving License',
                    description: 'Motor Vehicle Driving License',
                    issuer: 'Transport Department',
                    issuerid: 'in.gov.transport',
                    date: '2022-01-10',
                    mime: 'application/pdf',
                },
                {
                    uri: 'in.gov.cbse-CLASS10-123456789',
                    doctype: 'CLASS10',
                    name: 'Class 10 Certificate',
                    description: 'Secondary School Certificate',
                    issuer: 'CBSE',
                    issuerid: 'in.gov.cbse',
                    date: '2015-05-30',
                    mime: 'application/pdf',
                },
                {
                    uri: 'in.gov.cbse-CLASS12-987654321',
                    doctype: 'CLASS12',
                    name: 'Class 12 Certificate',
                    description: 'Higher Secondary Certificate',
                    issuer: 'CBSE',
                    issuerid: 'in.gov.cbse',
                    date: '2017-05-30',
                    mime: 'application/pdf',
                },
            ];
        }

        const response = await fetch(DIGILOCKER_CONFIG.documentsUrl, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch documents');
        }

        const data = await response.json();
        return data.items || [];
    }

    /**
     * Pull a specific document from DigiLocker
     */
    async pullDocument(userId: number, documentUri: string): Promise<{
        document: any;
        rawData?: string;
    }> {
        const tokens = tokenStorage.get(userId);
        if (!tokens) {
            throw new Error('User not authenticated with DigiLocker');
        }

        // Demo mode - return mock document data
        if (this.demoMode) {
            const docType = documentUri.split('-')[1];

            const mockData: Record<string, any> = {
                ADHAR: {
                    type: 'Aadhaar',
                    name: 'Demo User',
                    uid: 'XXXX-XXXX-1234',
                    gender: 'M',
                    dob: '15-01-1990',
                    address: 'Demo Address, City, State - 110001',
                    photo: null, // Base64 would go here
                },
                PAN: {
                    type: 'PAN',
                    name: 'DEMO USER',
                    pan: 'ABCDE1234F',
                    dob: '15/01/1990',
                    fatherName: 'FATHER NAME',
                },
                DRVLC: {
                    type: 'Driving License',
                    name: 'DEMO USER',
                    dlNumber: 'DL-1234567890123',
                    dob: '15-01-1990',
                    validFrom: '10-01-2022',
                    validTo: '09-01-2042',
                    vehicleClass: ['LMV', 'MCWG'],
                    bloodGroup: 'O+',
                },
                CLASS10: {
                    type: 'Class 10 Certificate',
                    name: 'Demo User',
                    rollNumber: '123456789',
                    year: '2015',
                    board: 'CBSE',
                    percentage: '92.4%',
                    subjects: {
                        'English': 95,
                        'Hindi': 90,
                        'Mathematics': 98,
                        'Science': 94,
                        'Social Science': 85,
                    },
                },
                CLASS12: {
                    type: 'Class 12 Certificate',
                    name: 'Demo User',
                    rollNumber: '987654321',
                    year: '2017',
                    board: 'CBSE',
                    stream: 'Science (PCM)',
                    percentage: '94.2%',
                    subjects: {
                        'English': 92,
                        'Physics': 95,
                        'Chemistry': 93,
                        'Mathematics': 98,
                        'Computer Science': 94,
                    },
                },
            };

            return {
                document: mockData[docType] || { type: 'Unknown', raw: documentUri },
            };
        }

        // Real API call
        const response = await fetch(DIGILOCKER_CONFIG.pullDocUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uri: documentUri }),
        });

        if (!response.ok) {
            throw new Error('Failed to pull document');
        }

        return response.json();
    }

    /**
     * Check if user is connected to DigiLocker
     */
    isConnected(userId: number): boolean {
        return tokenStorage.has(userId);
    }

    /**
     * Disconnect user from DigiLocker
     */
    disconnect(userId: number): void {
        tokenStorage.delete(userId);
    }

    /**
     * Check if running in demo mode
     */
    isDemoMode(): boolean {
        return this.demoMode;
    }
}

export const digilockerService = new DigiLockerService();
