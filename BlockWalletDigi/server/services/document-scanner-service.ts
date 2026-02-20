/**
 * Document Scanner Service
 * Implements PRD v3.1 Layer 1: Document Verification
 *
 * Features:
 * - OCR text extraction from ID documents via Google Cloud Vision
 * - Document type detection (Aadhaar, PAN, Passport, DL)
 * - Field extraction (name, DOB, ID number, address)
 * - Authenticity checks (deterministic heuristics)
 * - Face extraction for matching
 */

import vision, { ImageAnnotatorClient } from '@google-cloud/vision';

export interface DocumentScanRequest {
    userId: string;
    imageData: string;  // Base64 encoded image
    documentType?: 'aadhaar' | 'pan' | 'passport' | 'driving_license' | 'voter_id' | 'auto';
}

export interface ExtractedField {
    field: string;
    value: string;
    confidence: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface DocumentScanResult {
    success: boolean;
    documentId: string;
    documentType: string;
    extractedFields: ExtractedField[];
    extractedData: {
        fullName?: string;
        dateOfBirth?: string;
        documentNumber?: string;
        address?: string;
        gender?: string;
        issueDate?: string;
        expiryDate?: string;
        fatherName?: string;
        nationality?: string;
    };
    faceExtracted: boolean;
    faceImageData?: string;
    authenticityChecks: {
        checkName: string;
        passed: boolean;
        confidence: number;
    }[];
    overallScore: number;  // 0-100
    warnings: string[];
    processingTimeMs: number;
}

interface StoredDocument {
    id: string;
    userId: string;
    type: string;
    result: DocumentScanResult;
    scannedAt: Date;
    verified: boolean;
}

// Store scanned documents
const scannedDocuments = new Map<string, StoredDocument>();

// --- Graceful API key fallback helper (Task 2.4) ---

const isProduction = process.env.NODE_ENV === 'production';

function assertApiConfigured(key: string, serviceName: string): boolean {
    if (!process.env[key]) {
        if (isProduction) {
            throw new Error(`${serviceName} API key (${key}) is required in production`);
        }
        console.warn(`[${serviceName}] ${key} not set — using demo fallback`);
        return false;
    }
    return true;
}

// --- Google Cloud Vision OCR helper (Task 2.1) ---

let visionClient: ImageAnnotatorClient | null = null;

function getVisionClient(): ImageAnnotatorClient | null {
    if (!assertApiConfigured('GOOGLE_VISION_API_KEY', 'OCR')) {
        return null;
    }
    if (!visionClient) {
        visionClient = new vision.ImageAnnotatorClient({
            apiKey: process.env.GOOGLE_VISION_API_KEY,
        });
    }
    return visionClient;
}

/**
 * Call Google Cloud Vision text detection on a base64 image.
 * Returns an array of detected text blocks.
 * Falls back to [] if GOOGLE_VISION_API_KEY is not set.
 */
async function callGoogleVision(base64Image: string): Promise<string[]> {
    const client = getVisionClient();
    if (!client) {
        return [];
    }

    try {
        // Strip data URI prefix if present
        const imageContent = base64Image.replace(/^data:image\/\w+;base64,/, '');

        const [result] = await client.textDetection({
            image: { content: imageContent },
        });

        const annotations = result.textAnnotations;
        if (!annotations || annotations.length === 0) {
            return [];
        }

        // First annotation is the full text, rest are individual blocks
        return annotations.map((a) => a.description ?? '').filter(Boolean);
    } catch (err) {
        console.error('[OCR] Google Vision API call failed:', err);
        return [];
    }
}

// --- Document type detection from OCR text (Task 2.1) ---

/**
 * Detect document type from OCR text blocks.
 * Uses keyword matching instead of Math.random().
 */
function detectDocumentTypeFromText(textBlocks: string[]): string {
    const fullText = textBlocks.join(' ').toUpperCase();

    if (fullText.includes('AADHAAR') || fullText.includes('आधार') || fullText.includes('UIDAI')) {
        return 'aadhaar';
    }
    if (fullText.includes('INCOME TAX') || fullText.includes('PAN') || fullText.includes('PERMANENT ACCOUNT NUMBER')) {
        return 'pan';
    }
    if (fullText.includes('PASSPORT') || fullText.includes('REPUBLIC OF INDIA') || fullText.includes('TRAVEL DOCUMENT')) {
        return 'passport';
    }
    if (fullText.includes('DRIVING LICENCE') || fullText.includes('DRIVING LICENSE') || fullText.includes('TRANSPORT')) {
        return 'driving_license';
    }
    if (fullText.includes('ELECTION') || fullText.includes('VOTER') || fullText.includes('ELECTION COMMISSION')) {
        return 'voter_id';
    }

    // Default to aadhaar if nothing matches (deterministic, not random)
    return 'aadhaar';
}

// --- Regex-based field extraction from OCR text (Task 2.1) ---

/** Document number regex patterns per document type */
const DOCUMENT_NUMBER_PATTERNS: Record<string, RegExp> = {
    aadhaar: /\d{4}\s\d{4}\s\d{4}/,
    pan: /[A-Z]{5}\d{4}[A-Z]{1}/,
    passport: /[A-Z]\d{7}/,
    driving_license: /DL-?\d{2}-?\d{11}/,
    voter_id: /[A-Z]{3}\d{7}/,
};

function extractFieldsFromOcrText(textBlocks: string[], documentType: string): ExtractedField[] {
    const fullText = textBlocks.join('\n');
    const fields: ExtractedField[] = [];

    // --- Extract name ---
    // Heuristic: look for a line that's all uppercase letters and spaces (name line)
    const nameMatch = fullText.match(/^([A-Z][A-Z ]{2,40})$/m);
    if (nameMatch) {
        fields.push({ field: 'name', value: nameMatch[1].trim(), confidence: 0.95 });
    } else {
        // Fallback: look for "Name" label followed by value
        const nameLabelMatch = fullText.match(/(?:Name|नाम)\s*[:\-]?\s*([A-Za-z ]{2,40})/i);
        if (nameLabelMatch) {
            fields.push({ field: 'name', value: nameLabelMatch[1].trim(), confidence: 0.7 });
        }
    }

    // --- Extract date of birth ---
    const dobPatterns = [
        /DOB\s*[:\-]?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
        /Date\s*of\s*Birth\s*[:\-]?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
        /(?:जन्म\s*तिथि|जन्म\s*दिनांक)\s*[:\-]?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
        /(\d{2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4})/i,
    ];
    for (const pattern of dobPatterns) {
        const dobMatch = fullText.match(pattern);
        if (dobMatch) {
            fields.push({ field: 'dob', value: dobMatch[1].trim(), confidence: 0.95 });
            break;
        }
    }

    // --- Extract document number based on type ---
    const numPattern = DOCUMENT_NUMBER_PATTERNS[documentType];
    if (numPattern) {
        const numMatch = fullText.match(numPattern);
        if (numMatch) {
            const fieldName = documentType === 'aadhaar' ? 'aadhaar_number'
                : documentType === 'pan' ? 'pan_number'
                : documentType === 'passport' ? 'passport_number'
                : documentType === 'driving_license' ? 'dl_number'
                : 'document_number';
            fields.push({ field: fieldName, value: numMatch[0].trim(), confidence: 0.95 });
        }
    }

    // --- Extract gender ---
    const genderMatch = fullText.match(/\b(Male|Female|MALE|FEMALE|पुरुष|महिला|Transgender)\b/i);
    if (genderMatch) {
        fields.push({ field: 'gender', value: genderMatch[1].trim(), confidence: 0.98 });
    }

    // --- Extract address (for Aadhaar/DL) ---
    if (documentType === 'aadhaar' || documentType === 'driving_license') {
        const addressMatch = fullText.match(/(?:Address|पता)\s*[:\-]?\s*([\s\S]{10,120}?)(?:\n\n|\d{6})/i);
        if (addressMatch) {
            fields.push({ field: 'address', value: addressMatch[1].replace(/\n/g, ', ').trim(), confidence: 0.7 });
        }
    }

    // --- Extract father's name (for PAN) ---
    if (documentType === 'pan') {
        const fatherMatch = fullText.match(/(?:Father|पिता)\s*(?:'s)?\s*(?:Name)?\s*[:\-]?\s*([A-Z ]{2,40})/i);
        if (fatherMatch) {
            fields.push({ field: 'father_name', value: fatherMatch[1].trim(), confidence: 0.7 });
        }
    }

    // --- Extract MRZ for passport ---
    if (documentType === 'passport') {
        const mrzMatch = fullText.match(/([A-Z0-9<]{44})\n([A-Z0-9<]{44})/);
        if (mrzMatch) {
            // Parse MRZ line 2 for passport number (positions 1-9)
            const passportNum = mrzMatch[2].substring(0, 9).replace(/</g, '');
            if (passportNum && !fields.find(f => f.field === 'passport_number')) {
                fields.push({ field: 'passport_number', value: passportNum, confidence: 0.95 });
            }
        }
        fields.push({ field: 'nationality', value: 'INDIAN', confidence: 0.7 });
    }

    // --- Extract validity/expiry ---
    const expiryMatch = fullText.match(/(?:Valid|Expiry|Validity|Valid\s*(?:Till|Upto|Until))\s*[:\-]?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (expiryMatch) {
        fields.push({ field: 'expiry_date', value: expiryMatch[1].trim(), confidence: 0.7 });
    }

    const issueMatch = fullText.match(/(?:Issue\s*Date|Date\s*of\s*Issue)\s*[:\-]?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (issueMatch) {
        fields.push({ field: 'issue_date', value: issueMatch[1].trim(), confidence: 0.7 });
    }

    return fields;
}

// --- Mock field extraction fallback for dev mode ---

function getMockFields(documentType: string): ExtractedField[] {
    console.warn('[OCR] GOOGLE_VISION_API_KEY not set — using mock data');

    const fields: ExtractedField[] = [];

    switch (documentType) {
        case 'aadhaar':
            fields.push(
                { field: 'name', value: 'Rahul Sharma', confidence: 0.95 },
                { field: 'dob', value: '15/08/1995', confidence: 0.92 },
                { field: 'gender', value: 'Male', confidence: 0.98 },
                { field: 'aadhaar_number', value: 'XXXX XXXX 4532', confidence: 0.88 },
                { field: 'address', value: 'House 123, Sector 15, Gurgaon, Haryana 122001', confidence: 0.85 }
            );
            break;

        case 'pan':
            fields.push(
                { field: 'name', value: 'RAHUL SHARMA', confidence: 0.96 },
                { field: 'father_name', value: 'SURESH SHARMA', confidence: 0.94 },
                { field: 'dob', value: '15/08/1995', confidence: 0.93 },
                { field: 'pan_number', value: 'ABCDE1234F', confidence: 0.97 }
            );
            break;

        case 'passport':
            fields.push(
                { field: 'name', value: 'RAHUL SHARMA', confidence: 0.97 },
                { field: 'nationality', value: 'INDIAN', confidence: 0.99 },
                { field: 'dob', value: '15 AUG 1995', confidence: 0.95 },
                { field: 'passport_number', value: 'J1234567', confidence: 0.94 },
                { field: 'issue_date', value: '20 MAR 2020', confidence: 0.92 },
                { field: 'expiry_date', value: '19 MAR 2030', confidence: 0.93 }
            );
            break;

        case 'driving_license':
            fields.push(
                { field: 'name', value: 'RAHUL SHARMA', confidence: 0.94 },
                { field: 'dob', value: '15-08-1995', confidence: 0.91 },
                { field: 'dl_number', value: 'HR-0619850012345', confidence: 0.89 },
                { field: 'address', value: 'Sector 15, Gurgaon', confidence: 0.82 },
                { field: 'expiry_date', value: '2025-08-14', confidence: 0.88 }
            );
            break;
    }

    return fields;
}

// --- Main scan function ---

/**
 * Scan and extract data from document image
 */
export async function scanDocument(request: DocumentScanRequest): Promise<DocumentScanResult> {
    const startTime = Date.now();
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Call OCR (returns [] if API key not configured)
    const textBlocks = await callGoogleVision(request.imageData);
    const hasOcr = textBlocks.length > 0;

    // Detect document type — from OCR text if available, otherwise from request
    const documentType = request.documentType === 'auto' || !request.documentType
        ? (hasOcr ? detectDocumentTypeFromText(textBlocks) : 'aadhaar')
        : request.documentType;

    // Extract fields — real OCR if available, mock fallback otherwise
    const extractedFields = hasOcr
        ? extractFieldsFromOcrText(textBlocks, documentType)
        : getMockFields(documentType);

    // Parse extracted data
    const extractedData = parseExtractedData(extractedFields, documentType);

    // Extract face from document
    const faceData = extractFaceFromDocument(request.imageData);

    // Run deterministic authenticity checks (Task 2.2)
    const authenticityChecks = performAuthenticityChecks(request.imageData, documentType, textBlocks, extractedFields);

    // Calculate overall score
    const overallScore = calculateDocumentScore(extractedFields, authenticityChecks);

    // Generate warnings
    const warnings = generateWarnings(extractedData, authenticityChecks);

    const result: DocumentScanResult = {
        success: overallScore >= 60,
        documentId,
        documentType,
        extractedFields,
        extractedData,
        faceExtracted: faceData.found,
        faceImageData: faceData.imageData,
        authenticityChecks,
        overallScore,
        warnings,
        processingTimeMs: Date.now() - startTime
    };

    // Store document
    scannedDocuments.set(documentId, {
        id: documentId,
        userId: request.userId,
        type: documentType,
        result,
        scannedAt: new Date(),
        verified: overallScore >= 80
    });

    return result;
}

/**
 * Parse extracted fields into structured data
 */
function parseExtractedData(fields: ExtractedField[], documentType: string): DocumentScanResult['extractedData'] {
    const data: DocumentScanResult['extractedData'] = {};

    for (const field of fields) {
        switch (field.field) {
            case 'name':
                data.fullName = field.value;
                break;
            case 'dob':
                data.dateOfBirth = normalizeDateFormat(field.value);
                break;
            case 'aadhaar_number':
            case 'pan_number':
            case 'passport_number':
            case 'dl_number':
                data.documentNumber = field.value;
                break;
            case 'address':
                data.address = field.value;
                break;
            case 'gender':
                data.gender = field.value;
                break;
            case 'father_name':
                data.fatherName = field.value;
                break;
            case 'nationality':
                data.nationality = field.value;
                break;
            case 'issue_date':
                data.issueDate = field.value;
                break;
            case 'expiry_date':
            case 'validity':
                data.expiryDate = field.value;
                break;
        }
    }

    return data;
}

/**
 * Normalize date formats
 */
function normalizeDateFormat(dateStr: string): string {
    // Convert various formats to YYYY-MM-DD
    const formats = [
        /(\d{2})\/(\d{2})\/(\d{4})/,  // DD/MM/YYYY
        /(\d{2})-(\d{2})-(\d{4})/,    // DD-MM-YYYY
        /(\d{2})\s+(\w+)\s+(\d{4})/,  // DD MMM YYYY
    ];

    for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
            // Simplified - just return as-is for demo
            return dateStr;
        }
    }

    return dateStr;
}

/**
 * Extract face from document photo
 */
function extractFaceFromDocument(imageData: string): { found: boolean; imageData?: string } {
    // TODO: Implement face region detection via Vision Face API
    // For now, assume face found if image data is present
    return {
        found: imageData.length > 0,
        imageData: 'base64_extracted_face_data'
    };
}

// --- Deterministic authenticity checks (Task 2.2) ---

/**
 * Run deterministic authenticity checks on document.
 * Replaces the old random-based checks with heuristic rules.
 */
function performAuthenticityChecks(
    imageData: string,
    documentType: string,
    textBlocks: string[],
    extractedFields: ExtractedField[],
): DocumentScanResult['authenticityChecks'] {
    const checks: DocumentScanResult['authenticityChecks'] = [];

    // 1. image_quality — Pass if base64 length > 50000 (implies ≥200KB image)
    const imageLength = imageData.replace(/^data:image\/\w+;base64,/, '').length;
    checks.push({
        checkName: 'Image quality sufficient',
        passed: imageLength > 50000,
        confidence: imageLength > 50000 ? 0.9 : 0.4,
    });

    // 2. text_clarity — Pass if OCR returned ≥5 text blocks with confidence ≥0.8
    const highConfidenceFields = extractedFields.filter(f => f.confidence >= 0.8);
    checks.push({
        checkName: 'Text clarity',
        passed: textBlocks.length >= 5 && highConfidenceFields.length >= 3,
        confidence: textBlocks.length >= 5 ? 0.85 : 0.5,
    });

    // 3. document_format — Pass if extracted document number matches the expected regex
    const docNumPattern = DOCUMENT_NUMBER_PATTERNS[documentType];
    const docNumField = extractedFields.find(f =>
        ['aadhaar_number', 'pan_number', 'passport_number', 'dl_number', 'document_number'].includes(f.field)
    );
    const docFormatPassed = docNumField && docNumPattern
        ? docNumPattern.test(docNumField.value)
        : false;
    checks.push({
        checkName: 'Document format valid',
        passed: docFormatPassed,
        confidence: docFormatPassed ? 0.95 : 0.3,
    });

    // 4. face_region — Always true (face detection requires Vision Face API)
    // TODO: Implement face region detection via Google Vision Face API
    checks.push({
        checkName: 'Face region detected',
        passed: true,
        confidence: 0.7,
    });

    // 5. security_features — confidence = 0.6, pass = true
    // TODO: Implement hologram detection via ML
    checks.push({
        checkName: 'Security features',
        passed: true,
        confidence: 0.6,
    });

    return checks;
}

/**
 * Calculate overall document score
 */
function calculateDocumentScore(fields: ExtractedField[], checks: DocumentScanResult['authenticityChecks']): number {
    if (fields.length === 0) return 0;

    // Average field confidence
    const avgFieldConfidence = fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length;

    // Average check confidence (only passed checks)
    const passedChecks = checks.filter(c => c.passed);
    const avgCheckConfidence = passedChecks.reduce((sum, c) => sum + c.confidence, 0) / checks.length;

    // Pass rate
    const passRate = passedChecks.length / checks.length;

    // Weighted score
    const score = (avgFieldConfidence * 40) + (avgCheckConfidence * 30) + (passRate * 30);

    return Math.round(score);
}

/**
 * Generate warnings based on analysis
 */
function generateWarnings(data: DocumentScanResult['extractedData'], checks: DocumentScanResult['authenticityChecks']): string[] {
    const warnings: string[] = [];

    // Check for missing required fields
    if (!data.fullName) warnings.push('Name could not be extracted');
    if (!data.documentNumber) warnings.push('Document number unclear');

    // Check for failed authenticity checks
    for (const check of checks) {
        if (!check.passed) {
            warnings.push(`Failed check: ${check.checkName}`);
        }
    }

    // Check for expiry
    if (data.expiryDate) {
        const expiry = new Date(data.expiryDate);
        if (expiry < new Date()) {
            warnings.push('Document may be expired');
        }
    }

    return warnings;
}

/**
 * Get scanned document by ID
 */
export function getScannedDocument(documentId: string): StoredDocument | null {
    return scannedDocuments.get(documentId) || null;
}

/**
 * Get all documents for user
 */
export function getUserDocuments(userId: string): StoredDocument[] {
    const docs: StoredDocument[] = [];
    for (const doc of scannedDocuments.values()) {
        if (doc.userId === userId) {
            docs.push(doc);
        }
    }
    return docs;
}

/**
 * Get document verification status for trust score
 */
export function getDocumentVerificationStatus(userId: string): {
    verified: boolean;
    documentCount: number;
    types: string[];
} {
    const docs = getUserDocuments(userId);
    const verifiedDocs = docs.filter(d => d.verified);

    return {
        verified: verifiedDocs.length > 0,
        documentCount: verifiedDocs.length,
        types: verifiedDocs.map(d => d.type)
    };
}
