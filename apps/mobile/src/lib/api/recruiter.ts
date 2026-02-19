import { requestRole } from './core';

export async function getRecruiterVerifications(): Promise<any[]> {
  try {
    const data = await requestRole<any>('recruiter', 'v1/verifications');
    return Array.isArray(data) ? data : data?.items || data?.records || [];
  } catch {
    const legacyData = await requestRole<any>('recruiter', 'verifications');
    return Array.isArray(legacyData) ? legacyData : legacyData?.records || [];
  }
}

export async function verifyRecruiterInstant(payload: {
  jwt?: string;
  qrData?: string;
  credential?: Record<string, unknown>;
}): Promise<any> {
  return requestRole('recruiter', 'v1/verifications/instant', {
    method: 'POST',
    body: payload,
  });
}

export async function getRecruiterVerificationDetail(id: string): Promise<any> {
  return requestRole('recruiter', `v1/verifications/${id}`);
}
