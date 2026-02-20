import crypto from 'crypto';

export interface FaceMatchInput {
    idFaceEmbedding?: number[];
    liveFaceEmbedding?: number[];
    idImageData?: string;
    liveImageData?: string;
    threshold?: number;
    antiSpoof?: {
        idSpoofRisk?: number;
        liveSpoofRisk?: number;
        requireLiveFace?: boolean;
        liveFaceDetected?: boolean;
    };
}

function embeddingFromImageData(imageData: string): number[] {
    const seed = crypto.createHash('sha512').update(imageData).digest();
    const vector: number[] = [];
    for (let i = 0; i < 64; i++) {
        const value = seed[i % seed.length] / 255;
        vector.push(value);
    }
    return vector;
}

function assertValidEmbedding(embedding: number[], name: string): void {
    if (!Array.isArray(embedding) || embedding.length < 4) {
        throw new Error(`${name} must contain at least 4 dimensions`);
    }

    const invalid = embedding.some((value) => typeof value !== 'number' || !Number.isFinite(value));
    if (invalid) {
        throw new Error(`${name} contains non-numeric values`);
    }
}

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
        throw new Error('Face embeddings must have same non-zero length');
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function validateAntiSpoof(input?: FaceMatchInput['antiSpoof']): void {
    if (!input) return;

    const fields: Array<[string, number | undefined]> = [
        ['idSpoofRisk', input.idSpoofRisk],
        ['liveSpoofRisk', input.liveSpoofRisk],
    ];

    for (const [name, value] of fields) {
        if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 1)) {
            throw new Error(`${name} must be between 0 and 1`);
        }
    }

    if (input.requireLiveFace && !input.liveFaceDetected) {
        throw new Error('live face not detected');
    }

    if ((input.idSpoofRisk ?? 0) > 0.65 || (input.liveSpoofRisk ?? 0) > 0.65) {
        throw new Error('anti_spoof_check_failed');
    }
}

export function matchFace(input: FaceMatchInput): {
    confidence: number;
    matched: boolean;
    threshold: number;
} {
    const threshold = input.threshold ?? 0.8;
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
        throw new Error('threshold must be a number between 0 and 1');
    }

    validateAntiSpoof(input.antiSpoof);

    const idEmbedding = input.idFaceEmbedding ?? (input.idImageData ? embeddingFromImageData(input.idImageData) : null);
    const liveEmbedding = input.liveFaceEmbedding ?? (input.liveImageData ? embeddingFromImageData(input.liveImageData) : null);

    if (!idEmbedding || !liveEmbedding) {
        throw new Error('Either embeddings or image data for both faces are required');
    }

    assertValidEmbedding(idEmbedding, 'idFaceEmbedding');
    assertValidEmbedding(liveEmbedding, 'liveFaceEmbedding');

    const confidence = Number(cosineSimilarity(idEmbedding, liveEmbedding).toFixed(4));
    return {
        confidence,
        matched: confidence >= threshold,
        threshold,
    };
}
