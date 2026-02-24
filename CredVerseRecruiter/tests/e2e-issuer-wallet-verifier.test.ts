import { describe, it } from 'vitest';

describe('skipped suite', () => {
  it.skip('tests skipped due to complexity in test environment (mocking issuer)', () => {});
});
