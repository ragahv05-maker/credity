import { requestRole } from './core';

export async function getIssuerCredentials(): Promise<any[]> {
  const data = await requestRole<any>('issuer', 'v1/credentials');
  return Array.isArray(data) ? data : data?.credentials || [];
}

export async function issueCredential(input: {
  tenantId: string;
  templateId: string;
  issuerId: string;
  recipient: Record<string, unknown>;
  credentialData: Record<string, unknown>;
}): Promise<any> {
  return requestRole('issuer', 'v1/credentials/issue', {
    method: 'POST',
    body: {
      tenantId: input.tenantId,
      templateId: input.templateId,
      issuerId: input.issuerId,
      recipient: input.recipient,
      credentialData: input.credentialData,
    },
  });
}

const OID4VCI_PRE_AUTH_GRANT = 'urn:ietf:params:oauth:grant-type:pre-authorized_code';

function extractPreAuthorizedCode(offerResponse: any): string | null {
  return offerResponse?.credential_offer?.grants?.[OID4VCI_PRE_AUTH_GRANT]?.['pre-authorized_code'] || null;
}

export async function issueCredentialViaOid4vci(input: {
  tenantId: string;
  templateId: string;
  issuerId: string;
  recipient: Record<string, unknown>;
  credentialData: Record<string, unknown>;
  format?: 'sd-jwt-vc' | 'vc+jwt';
}): Promise<{
  credentialId: string | null;
  format: string | null;
  credential: string | null;
  status: any;
}> {
  let stage: 'offer' | 'token' | 'credential' = 'offer';
  try {
    const offerResponse = await requestRole<any>('issuer', 'v1/oid4vci/credential-offers', {
      method: 'POST',
      body: {
        tenantId: input.tenantId,
        templateId: input.templateId,
        issuerId: input.issuerId,
        recipient: input.recipient,
        credentialData: input.credentialData,
        format: input.format || 'sd-jwt-vc',
      },
      retryOnAuthFailure: false,
    });

    const preAuthorizedCode = extractPreAuthorizedCode(offerResponse);
    if (!preAuthorizedCode) {
      throw new Error('offer did not return a pre-authorized code');
    }

    stage = 'token';
    const tokenResponse = await requestRole<any>('issuer', 'v1/oid4vci/token', {
      method: 'POST',
      body: {
        grant_type: OID4VCI_PRE_AUTH_GRANT,
        'pre-authorized_code': preAuthorizedCode,
      },
      skipAuth: true,
      retryOnAuthFailure: false,
    });

    const accessToken = tokenResponse?.access_token as string | undefined;
    if (!accessToken) {
      throw new Error('token endpoint did not return access_token');
    }

    stage = 'credential';
    const credentialResponse = await requestRole<any>('issuer', 'v1/oid4vci/credential', {
      method: 'POST',
      body: {
        format: input.format || 'sd-jwt-vc',
      },
      skipAuth: true,
      retryOnAuthFailure: false,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      credentialId: credentialResponse?.credential_id || null,
      format: credentialResponse?.format || null,
      credential: credentialResponse?.credential || null,
      status: credentialResponse?.status || null,
    };
  } catch (error: any) {
    const message = error?.message || 'unknown OID4VCI error';
    throw new Error(`[oid4vci:${stage}] ${message}`);
  }
}

export async function getIssuerDeadLetterEntries(limit = 25): Promise<any[]> {
  const data = await requestRole<any>('issuer', `v1/queue/dead-letter?limit=${encodeURIComponent(String(limit))}`);
  return Array.isArray(data) ? data : data?.entries || [];
}

export async function replayIssuerDeadLetterEntry(entryId: string): Promise<any> {
  return requestRole('issuer', `v1/queue/dead-letter/${encodeURIComponent(entryId)}/replay`, {
    method: 'POST',
  });
}

export async function getIssuerQueueStats(): Promise<any> {
  return requestRole('issuer', 'v1/queue/stats');
}
