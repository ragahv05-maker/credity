export interface WalletState {
    userId: number;
    did: string;
    credentials: StoredCredential[];
    shares: ShareRecord[];
    consentLogs: ConsentLog[];
    consentGrants: ConsentGrantRecord[];
    dataRequests: DataRequestRecord[];
    notifications: WalletNotification[];
    backupKey?: string;
    lastSync: Date;
}

export interface StoredCredential {
    id: string;
    type: string[];
    issuer: string;
    issuanceDate: Date;
    expirationDate?: Date;
    data: any;
    jwt?: string;
    encryptedData: string;
    hash: string;
    anchorStatus: 'pending' | 'anchored' | 'revoked';
    anchorTxHash?: string;
    blockNumber?: number;
    category: 'academic' | 'employment' | 'government' | 'medical' | 'kyc' | 'skill' | 'other';
    mediaFiles?: MediaFile[];
    lastVerified?: Date;
    verificationCount: number;
}

export interface MediaFile {
    id: string;
    name: string;
    type: string;
    ipfsHash?: string;
    encryptedUrl: string;
    size: number;
}

export interface ShareRecord {
    id: string;
    credentialId: string;
    shareType: 'qr' | 'link' | 'email' | 'whatsapp' | 'ats' | 'recruiter';
    recipientInfo?: string;
    disclosedFields: string[];
    token: string;
    expiry: Date;
    createdAt: Date;
    accessLog: AccessLog[];
    revoked: boolean;
}

export interface AccessLog {
    timestamp: Date;
    ip: string;
    userAgent: string;
    location?: string;
    organization?: string;
    verified: boolean;
}

export interface ConsentLog {
    id: string;
    credentialId: string;
    action: 'share' | 'verify' | 'revoke';
    disclosedFields: string[];
    recipientDid?: string;
    recipientName?: string;
    purpose: string;
    timestamp: Date;
    ipAddress?: string;
}

export interface ConsentGrantRecord {
    id: string;
    subject_id: string;
    verifier_id: string;
    purpose: string;
    data_elements: string[];
    expiry: string;
    revocation_ts: string | null;
    consent_proof: Record<string, unknown>;
    created_at: string;
}

export interface DataRequestRecord {
    id: string;
    user_id: number;
    request_type: 'export' | 'delete';
    status: 'accepted' | 'processing' | 'completed';
    created_at: string;
    completed_at: string | null;
    reason?: string;
    result?: Record<string, unknown>;
}

export interface CertInIncidentRecord {
    id: string;
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    detected_at: string;
    report_due_at: string;
    status: 'open' | 'reported' | 'closed';
    report_reference?: string;
    metadata: Record<string, unknown>;
    log_retention_days: number;
    created_at: string;
    updated_at: string;
}

export interface WalletNotification {
    id: string;
    type: 'verification' | 'share_access' | 'credential_received' | 'credential_revoked' | 'sync' | 'security';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    data?: any;
}

export type PersistedStoredCredential = Omit<StoredCredential, 'issuanceDate' | 'expirationDate' | 'lastVerified'> & {
    issuanceDate: string;
    expirationDate?: string;
    lastVerified?: string;
};

export type PersistedShareRecord = Omit<ShareRecord, 'expiry' | 'createdAt' | 'accessLog'> & {
    expiry: string;
    createdAt: string;
    accessLog: Array<Omit<AccessLog, 'timestamp'> & { timestamp: string }>;
};

export type PersistedConsentLog = Omit<ConsentLog, 'timestamp'> & { timestamp: string };
export type PersistedNotification = Omit<WalletNotification, 'timestamp'> & { timestamp: string };

export type PersistedWalletState = Omit<WalletState, 'lastSync' | 'credentials' | 'shares' | 'consentLogs' | 'notifications'> & {
    lastSync: string;
    credentials: PersistedStoredCredential[];
    shares: PersistedShareRecord[];
    consentLogs: PersistedConsentLog[];
    notifications: PersistedNotification[];
};

export type WalletServiceState = {
    wallets: Array<[number, PersistedWalletState]>;
    certInIncidents: Array<[string, CertInIncidentRecord]>;
};
