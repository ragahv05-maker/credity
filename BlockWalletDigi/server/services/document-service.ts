/**
 * Document Verification Service
 * Handles KYC document processing
 */

export interface DocumentVerificationStatus {
    verified: boolean;
    documentType?: string;
    verifiedAt?: Date;
    issues?: string[];
}

const userDocumentStatus = new Map<string, DocumentVerificationStatus>();

/**
 * Get document verification status for a user
 */
export function getDocumentVerificationStatus(userId: string): DocumentVerificationStatus {
    const status = userDocumentStatus.get(userId);
    if (status) {
        return status;
    }
    return { verified: false };
}

/**
 * Submit document for verification (simulated)
 */
export async function verifyDocument(userId: string, documentType: string, documentData: string): Promise<DocumentVerificationStatus> {
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));

    const isSuccess = Math.random() > 0.1;
    const status: DocumentVerificationStatus = {
        verified: isSuccess,
        documentType,
        verifiedAt: isSuccess ? new Date() : undefined,
        issues: isSuccess ? undefined : ['Document unclear', 'Edges not visible']
    };

    userDocumentStatus.set(userId, status);
    return status;
}

export const documentService = {
    getDocumentVerificationStatus,
    verifyDocument
};
