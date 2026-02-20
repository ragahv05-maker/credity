import { afterEach, describe, expect, it } from 'vitest';
import { IpfsService } from '../server/services/ipfs';

describe('ipfs service production policy', () => {
  const originalJwt = process.env.PINATA_JWT;

  afterEach(() => {
    if (originalJwt === undefined) delete process.env.PINATA_JWT;
    else process.env.PINATA_JWT = originalJwt;
  });

  it('fails closed when PINATA_JWT is missing', async () => {
    delete process.env.PINATA_JWT;
    const ipfs = new IpfsService();

    await expect(ipfs.uploadJSON({ hello: 'world' })).rejects.toThrow('PINATA_JWT is required for IPFS uploads');
  });
});
