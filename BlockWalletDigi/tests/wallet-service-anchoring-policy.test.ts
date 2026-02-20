import { afterEach, describe, expect, it } from 'vitest';
import { resetWalletServiceStoreForTests, walletService } from '../server/services/wallet-service';

describe('wallet credential anchoring policy', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAnchorUrl = process.env.WALLET_ANCHOR_SERVICE_URL;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalAnchorUrl === undefined) {
      delete process.env.WALLET_ANCHOR_SERVICE_URL;
    } else {
      process.env.WALLET_ANCHOR_SERVICE_URL = originalAnchorUrl;
    }
    resetWalletServiceStoreForTests();
  });

  it('fails closed in production when no anchor service is configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.WALLET_ANCHOR_SERVICE_URL;

    await expect(
      walletService.storeCredential(777, {
        type: ['DegreeCredential'],
        issuer: 'CredVerse University',
        issuanceDate: new Date(),
        data: { student: 'Prod User' },
        category: 'academic',
      }),
    ).rejects.toThrow('Credential anchoring unavailable in production');
  });
});
