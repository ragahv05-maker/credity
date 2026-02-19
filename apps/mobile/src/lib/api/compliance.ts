import { requestRole } from './core';

export async function getHolderConsents(userId = 1): Promise<any[]> {
  const data = await requestRole<any>('holder', `v1/compliance/consents?userId=${encodeURIComponent(String(userId))}`);
  return Array.isArray(data) ? data : data?.consents || [];
}

export async function getHolderDataRequests(userId = 1): Promise<any[]> {
  const data = await requestRole<any>('holder', `v1/compliance/data-requests?userId=${encodeURIComponent(String(userId))}`);
  return Array.isArray(data) ? data : data?.requests || [];
}

export async function getHolderCertInIncidents(): Promise<any[]> {
  const data = await requestRole<any>('holder', 'v1/compliance/certin/incidents');
  return Array.isArray(data) ? data : data?.incidents || [];
}

export async function revokeHolderConsent(consentId: string, userId = 1): Promise<any> {
  return requestRole('holder', `v1/compliance/consents/${encodeURIComponent(consentId)}/revoke`, {
    method: 'POST',
    body: { userId },
  });
}

export async function submitHolderDataExport(userId = 1, reason?: string): Promise<any> {
  return requestRole('holder', 'v1/compliance/data-requests/export', {
    method: 'POST',
    body: {
      userId,
      ...(reason ? { reason } : {}),
    },
  });
}

export async function submitHolderDataDelete(userId = 1, reason?: string): Promise<any> {
  return requestRole('holder', 'v1/compliance/data-requests/delete', {
    method: 'POST',
    body: {
      userId,
      confirm: 'DELETE',
      ...(reason ? { reason } : {}),
    },
  });
}

export async function getIssuerComplianceConsents(): Promise<any[]> {
  const data = await requestRole<any>('issuer', 'v1/compliance/consents');
  return Array.isArray(data) ? data : data?.consents || [];
}

export async function revokeIssuerConsent(consentId: string): Promise<any> {
  return requestRole('issuer', `v1/compliance/consents/${encodeURIComponent(consentId)}/revoke`, {
    method: 'POST',
  });
}

export async function getIssuerDataRequests(): Promise<any[]> {
  const data = await requestRole<any>('issuer', 'v1/compliance/data-requests');
  return Array.isArray(data) ? data : data?.requests || [];
}

export async function getIssuerCertInIncidents(): Promise<any[]> {
  const data = await requestRole<any>('issuer', 'v1/compliance/certin/incidents');
  return Array.isArray(data) ? data : data?.incidents || [];
}

export async function requestIssuerDataExport(subjectId: string, reason?: string): Promise<any> {
  return requestRole('issuer', 'v1/compliance/data-requests/export', {
    method: 'POST',
    body: {
      subject_id: subjectId,
      ...(reason ? { reason } : {}),
    },
  });
}

export async function exportIssuerAuditLog(format: 'json' | 'ndjson' = 'json'): Promise<any> {
  return requestRole<any>('issuer', `v1/compliance/audit-log/export?format=${format}`);
}

export async function getRecruiterComplianceConsents(): Promise<any[]> {
  const data = await requestRole<any>('recruiter', 'v1/compliance/consents');
  return Array.isArray(data) ? data : data?.consents || [];
}

export async function revokeRecruiterConsent(consentId: string): Promise<any> {
  return requestRole('recruiter', `v1/compliance/consents/${encodeURIComponent(consentId)}/revoke`, {
    method: 'POST',
  });
}

export async function getRecruiterDataRequests(): Promise<any[]> {
  const data = await requestRole<any>('recruiter', 'v1/compliance/data-requests');
  return Array.isArray(data) ? data : data?.requests || [];
}

export async function getRecruiterCertInIncidents(): Promise<any[]> {
  const data = await requestRole<any>('recruiter', 'v1/compliance/certin/incidents');
  return Array.isArray(data) ? data : data?.incidents || [];
}

export async function requestRecruiterDataExport(subjectId: string, reason?: string): Promise<any> {
  return requestRole('recruiter', 'v1/compliance/data-requests/export', {
    method: 'POST',
    body: {
      subject_id: subjectId,
      ...(reason ? { reason } : {}),
    },
  });
}

export async function exportRecruiterAuditLog(format: 'json' | 'ndjson' = 'json'): Promise<any> {
  return requestRole<any>('recruiter', `v1/compliance/audit-log/export?format=${format}`);
}
