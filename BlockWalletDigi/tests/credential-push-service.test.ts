import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  pushCredentialToWallet,
  acceptCredentialOffer,
  rejectCredentialOffer,
  cleanupExpiredOffers,
  getPendingCredentials
} from '../server/services/credential-push-service';

describe('Credential Push Service', () => {
  const issuerId = 'issuer-123';
  const issuerName = 'Test Issuer';
  const credentialData = {
    type: ['VerifiableCredential'],
    data: { name: 'Test Credential' }
  };

  it('should push a credential to a wallet', async () => {
    const recipientDid = 'did:example:push';
    const result = await pushCredentialToWallet(issuerId, issuerName, recipientDid, credentialData);

    expect(result).toHaveProperty('offerId');
    expect(result.status).toBe('pending');

    const pending = getPendingCredentials(recipientDid);
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(result.offerId);
  });

  it('should accept a credential offer', async () => {
    const recipientDid = 'did:example:accept';
    const pushResult = await pushCredentialToWallet(issuerId, issuerName, recipientDid, credentialData);
    const result = acceptCredentialOffer(pushResult.offerId, recipientDid);

    expect(result.success).toBe(true);
    expect(result.credential).toEqual(credentialData);

    const pending = getPendingCredentials(recipientDid);
    expect(pending).toHaveLength(0); // Should be removed or status changed (implementation detail: status changed to accepted, getPending filters for pending)
  });

  it('should reject a credential offer', async () => {
    const recipientDid = 'did:example:reject';
    const pushResult = await pushCredentialToWallet(issuerId, issuerName, recipientDid, credentialData);
    const result = rejectCredentialOffer(pushResult.offerId, recipientDid);

    expect(result).toBe(true);

    const pending = getPendingCredentials(recipientDid);
    expect(pending).toHaveLength(0);
  });

  it('should cleanup expired offers', async () => {
    const recipientDid = 'did:example:cleanup';
    // Mock Date to simulate expiration
    const now = Date.now();
    const expiryHours = 1;

    // Create an offer that will expire
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const pushResult = await pushCredentialToWallet(issuerId, issuerName, recipientDid, credentialData, { expiryHours });

    // Fast forward time past expiry
    vi.setSystemTime(now + (expiryHours + 1) * 60 * 60 * 1000);

    const cleaned = cleanupExpiredOffers();
    expect(cleaned).toBeGreaterThan(0);

    vi.useRealTimers();
  });
});
