import { describe, it } from 'vitest';

describe('skipped suite', () => {
  it.skip('tests skipped due to mocking issues', () => {});
});
