import { afterEach, describe, expect, it, vi } from 'vitest';
import { assessSynthIdWatermark } from '../server/services/synthid-adapter';

describe('synthid adapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns unavailable when endpoint is not configured', async () => {
    const result = await assessSynthIdWatermark({
      mediaType: 'image',
      url: 'https://example.com/evidence.jpg',
    }, { endpoint: '' });

    expect(result.verdict).toBe('unavailable');
    expect(result.provider).toBe('not_configured');
  });

  it('marks documents as unsupported', async () => {
    const result = await assessSynthIdWatermark({
      mediaType: 'document',
      url: 'https://example.com/evidence.pdf',
    }, { endpoint: 'https://detector.example.com' });

    expect(result.verdict).toBe('unsupported');
    expect(result.provider).toBe('fallback');
  });

  it('accepts valid detector response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ verdict: 'watermark_detected', confidence: 0.92 }),
    })) as unknown as typeof fetch);

    const result = await assessSynthIdWatermark({
      mediaType: 'image',
      url: 'https://example.com/evidence.jpg',
    }, { endpoint: 'https://detector.example.com' });

    expect(result.verdict).toBe('watermark_detected');
    expect(result.provider).toBe('google_synthid');
    expect(result.confidence).toBe(0.92);
  });
});
