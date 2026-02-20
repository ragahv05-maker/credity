export type SupportedDocType = 'aadhaar' | 'pan' | 'passport' | 'driving_license';

const docTypeAliases: Record<string, SupportedDocType> = {
    aadhaar: 'aadhaar',
    aadhar: 'aadhaar',
    pan: 'pan',
    passport: 'passport',
    driving_license: 'driving_license',
    drivinglicence: 'driving_license',
    driving_license_number: 'driving_license',
    dl: 'driving_license',
};

function normalizeType(type: string): SupportedDocType | null {
    const sanitized = String(type || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    return docTypeAliases[sanitized] ?? null;
}

function normalizeDocumentNumber(value: string): string {
    return String(value || '')
        .trim()
        .replace(/[\s-]+/g, '')
        .toUpperCase();
}

function isLikelyFakeAadhaar(value: string): boolean {
    return /^([0-9])\1{11}$/.test(value);
}

const validators: Record<SupportedDocType, (value: string) => boolean> = {
    aadhaar: (value) => {
        const normalized = normalizeDocumentNumber(value);
        return /^[2-9][0-9]{11}$/.test(normalized) && !isLikelyFakeAadhaar(normalized);
    },
    pan: (value) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizeDocumentNumber(value)),
    passport: (value) => /^[A-PR-WY][0-9]{7}$/.test(normalizeDocumentNumber(value)),
    driving_license: (value) => /^[A-Z]{2}[0-9]{2}[0-9]{11,13}$/.test(normalizeDocumentNumber(value)),
};

export function validateDocumentByType(type: string, documentNumber: string): {
    valid: boolean;
    normalizedType?: SupportedDocType;
    normalizedDocumentNumber?: string;
    reason?: string;
} {
    const normalizedType = normalizeType(type);
    if (!normalizedType) {
        return { valid: false, reason: `Unsupported document type: ${type}` };
    }

    if (!documentNumber || typeof documentNumber !== 'string') {
        return { valid: false, normalizedType, reason: 'documentNumber is required' };
    }

    const normalizedDocumentNumber = normalizeDocumentNumber(documentNumber);
    const valid = validators[normalizedType](normalizedDocumentNumber);
    return {
        valid,
        normalizedType,
        normalizedDocumentNumber,
        reason: valid ? undefined : `Invalid ${normalizedType} format`,
    };
}
