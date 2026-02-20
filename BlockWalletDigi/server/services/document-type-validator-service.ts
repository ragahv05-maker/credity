export type SupportedDocType = 'aadhaar' | 'pan' | 'passport' | 'driving_license';

const validators: Record<SupportedDocType, (value: string) => boolean> = {
    aadhaar: (value) => /^[2-9][0-9]{11}$/.test(value.replace(/\s+/g, '')),
    pan: (value) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.toUpperCase()),
    passport: (value) => /^[A-PR-WYa-pr-wy][0-9]{7}$/.test(value),
    driving_license: (value) => /^[A-Z]{2}[0-9]{2}[0-9]{11,13}$/.test(value.toUpperCase()),
};

export function validateDocumentByType(type: string, documentNumber: string): {
    valid: boolean;
    normalizedType?: SupportedDocType;
    reason?: string;
} {
    const normalizedType = (type || '').toLowerCase() as SupportedDocType;
    const validator = validators[normalizedType];

    if (!validator) {
        return { valid: false, reason: `Unsupported document type: ${type}` };
    }

    if (!documentNumber || typeof documentNumber !== 'string') {
        return { valid: false, normalizedType, reason: 'documentNumber is required' };
    }

    const valid = validator(documentNumber.trim());
    return {
        valid,
        normalizedType,
        reason: valid ? undefined : `Invalid ${normalizedType} format`,
    };
}
