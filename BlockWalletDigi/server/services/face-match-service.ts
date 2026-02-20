import crypto from 'crypto';

export interface FaceMatchInput {
    idFaceEmbedding?: number[];
    liveFaceEmbedding?: number[];
    idImageData?: string;
    liveImageData?: string;
    threshold?: number;
}

function embeddingFromImageData(imageData: string): number[] {
    const digest = crypto.createHash('sha256').update(imageData).digest();
    const vector: number[] = [];
    for (let i = 0; i < 16; i++) {
        vector.push(digest[i] / 255);
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

export function matchFace(input: FaceMatchInput): {
    confidence: number;
    matched: boolean;
    threshold: number;
} {
    const threshold = input.threshold ?? 0.8;
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
        throw new Error('threshold must be a number between 0 and 1');
    }

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
