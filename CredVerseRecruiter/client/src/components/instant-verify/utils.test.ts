import { describe, it, expect } from 'vitest';
import { normalizeReasonCode, getDecisionTier, decisionCopy } from './utils';
import { DecisionTier } from './types';

describe('InstantVerify utils', () => {
  describe('normalizeReasonCode', () => {
    it('should normalize reason codes', () => {
      expect(normalizeReasonCode('some_reason_code')).toBe('SOME REASON CODE');
      expect(normalizeReasonCode('  code  ')).toBe('CODE');
      expect(normalizeReasonCode('mixed_case_code')).toBe('MIXED CASE CODE');
      expect(normalizeReasonCode('')).toBe('');
      expect(normalizeReasonCode(null as any)).toBe('');
    });
  });

  describe('getDecisionTier', () => {
    it('should return PASS for high confidence results', () => {
      expect(getDecisionTier({ recommendation: 'accept' })).toBe('PASS');
      expect(getDecisionTier({ recommendation: 'approve' })).toBe('PASS');
      expect(getDecisionTier({ status: 'verified' })).toBe('PASS');
    });

    it('should return REVIEW for suspicious or pending results', () => {
      expect(getDecisionTier({ recommendation: 'review' })).toBe('REVIEW');
      expect(getDecisionTier({ status: 'suspicious' })).toBe('REVIEW');
      expect(getDecisionTier({ status: 'pending' })).toBe('REVIEW');
      expect(getDecisionTier({ riskScore: 30 })).toBe('REVIEW');
      expect(getDecisionTier({ fraudScore: 30 })).toBe('REVIEW');
    });

    it('should return FAIL for rejection or failure', () => {
      expect(getDecisionTier({ recommendation: 'reject' })).toBe('FAIL');
      expect(getDecisionTier({ status: 'failed' })).toBe('FAIL');
      expect(getDecisionTier({ riskScore: 60 })).toBe('FAIL');
      expect(getDecisionTier({ fraudScore: 60 })).toBe('FAIL');
    });

    it('should prioritize recommendation over status', () => {
      expect(getDecisionTier({ recommendation: 'reject', status: 'verified' })).toBe('FAIL');
      expect(getDecisionTier({ recommendation: 'review', status: 'verified' })).toBe('REVIEW');
    });
  });

  describe('decisionCopy', () => {
    it('should return correct copy for PASS', () => {
      const result = decisionCopy('PASS');
      expect(result.title).toBe('Pass');
      expect(result.tone).toBe('emerald');
    });

    it('should return correct copy for REVIEW', () => {
      const result = decisionCopy('REVIEW');
      expect(result.title).toBe('Review');
      expect(result.tone).toBe('amber');
    });

    it('should return correct copy for FAIL', () => {
      const result = decisionCopy('FAIL');
      expect(result.title).toBe('Fail');
      expect(result.tone).toBe('red');
    });
  });
});
