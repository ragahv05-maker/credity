import { afterEach, describe, expect, it } from 'vitest';
import { evaluateSafeDate } from '../server/services/safedate';
import { evaluateWorkScore } from '../server/services/workscore';

describe('production evidence summary policy', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('requires SafeDate evidence summary in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() =>
      evaluateSafeDate({
        factors: {
          profile_integrity: 1,
          identity_confidence: 1,
          social_consistency: 1,
          behavior_stability: 1,
          risk_checks: 1,
        },
      }),
    ).toThrow('SafeDate evidence.summary is required in production');
  });

  it('requires WorkScore evidence summary in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() =>
      evaluateWorkScore({
        components: {
          identity: 1,
          education: 1,
          employment: 1,
          reputation: 1,
          skills: 1,
          crossTrust: 1,
        },
      }),
    ).toThrow('WorkScore evidence.summary is required in production');
  });
});
