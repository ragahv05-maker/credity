import { describe, expect, it } from 'vitest';
import { matchFace } from '../server/services/face-match-service';

describe('identity liveness/face benchmark harness', () => {
  it('meets baseline separation threshold for positive vs negative pairs', () => {
    const positives = [
      { a: [0.3, 0.4, 0.5, 0.2], b: [0.31, 0.39, 0.52, 0.21] },
      { a: [0.8, 0.1, 0.2, 0.4], b: [0.79, 0.11, 0.19, 0.41] },
      { a: [0.2, 0.7, 0.6, 0.3], b: [0.21, 0.69, 0.61, 0.31] },
    ];

    const negatives = [
      { a: [1, 0, 0, 0], b: [0, 1, 0, 0] },
      { a: [0, 0, 1, 0], b: [0, 0, 0, 1] },
      { a: [0.9, 0.2, 0.1, 0], b: [0.1, 0.8, 0.2, 0.1] },
    ];

    const positiveAvg = positives
      .map(({ a, b }) => matchFace({ idFaceEmbedding: a, liveFaceEmbedding: b }).confidence)
      .reduce((s, v) => s + v, 0) / positives.length;

    const negativeAvg = negatives
      .map(({ a, b }) => matchFace({ idFaceEmbedding: a, liveFaceEmbedding: b }).confidence)
      .reduce((s, v) => s + v, 0) / negatives.length;

    expect(positiveAvg).toBeGreaterThan(0.9);
    expect(negativeAvg).toBeLessThan(0.5);
  });
});
