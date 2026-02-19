import { requestRole } from './core';

export async function getHolderWalletStatus(): Promise<any> {
  return requestRole('holder', 'v1/wallet/status?userId=1');
}

export async function getHolderReputationScore(): Promise<any> {
  const data = await requestRole<any>('holder', 'v1/reputation/score?userId=1');
  return data?.reputation || data;
}

export async function getHolderSafeDateScore(): Promise<any> {
  const data = await requestRole<any>('holder', 'v1/reputation/safedate?userId=1');
  return data?.safe_date || data;
}

export async function getHolderCredentials(): Promise<any[]> {
  const data = await requestRole<any>('holder', 'v1/wallet/credentials');
  return Array.isArray(data) ? data : data?.credentials || [];
}

export async function getHolderCredential(id: string | number): Promise<any> {
  return requestRole('holder', `v1/wallet/credentials/${id}`);
}

export async function createCredentialShareQr(
  id: string | number,
  input?: { expiryMinutes?: 1 | 5 | 30 | 60; disclosedFields?: string[] },
): Promise<any> {
  return requestRole('holder', `v1/credentials/${id}/qr`, {
    method: 'POST',
    body: {
      expiryMinutes: input?.expiryMinutes ?? 5,
      disclosedFields: input?.disclosedFields ?? [],
    },
  });
}

export async function claimHolderCredentialOffer(url: string): Promise<any> {
  return requestRole('holder', 'v1/wallet/offer/claim', {
    method: 'POST',
    body: { url },
  });
}

export async function getHolderCredentialFields(id: string | number): Promise<{ fields: any[]; categories: any[] }> {
  return requestRole('holder', `v1/wallet/credentials/${id}/fields?userId=1`);
}

export async function createHolderDisclosure(input: {
  credentialId: string | number;
  requestedFields: string[];
  purpose?: string;
  requesterDID?: string;
  expiryMinutes?: number;
}): Promise<any> {
  return requestRole('holder', `v1/credentials/${input.credentialId}/disclose`, {
    method: 'POST',
    body: {
      requestedFields: input.requestedFields,
      purpose: input.purpose || 'recruiter_verification',
      requesterDID: input.requesterDID,
      expiryMinutes: input.expiryMinutes ?? 30,
    },
  });
}

export async function generateHolderProofMetadata(credentialId: string | number): Promise<any> {
  return requestRole('holder', 'v1/wallet/proofs/generate', {
    method: 'POST',
    body: { credentialId: String(credentialId) },
  });
}
