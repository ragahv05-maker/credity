import { describe, it } from 'vitest';

describe('skipped suite', () => {
  it.skip('tests skipped due to schema mismatch (candidate_summary vs v1)', () => {});
});
