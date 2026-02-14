#!/usr/bin/env node
import crypto from 'node:crypto';

const config = {
  issuerBase: (process.env.ISSUER_BASE_URL || 'http://localhost:5001').replace(/\/$/, ''),
  walletBase: (process.env.WALLET_BASE_URL || 'http://localhost:5002').replace(/\/$/, ''),
  recruiterBase: (process.env.RECRUITER_BASE_URL || 'http://localhost:5003').replace(/\/$/, ''),
  issuerApiKey:
    process.env.E2E_ISSUER_API_KEY
    || process.env.ISSUER_BOOTSTRAP_API_KEY
    || process.env.VITE_API_KEY
    || 'test-api-key',
  tenantId: process.env.E2E_TENANT_ID || '550e8400-e29b-41d4-a716-446655440000',
  templateId: process.env.E2E_TEMPLATE_ID || 'template-1',
  issuerId: process.env.E2E_ISSUER_ID || 'issuer-1',
  walletUserId: Number(process.env.E2E_WALLET_USER_ID || '1'),
  recruiterAccessToken: process.env.E2E_RECRUITER_ACCESS_TOKEN || '',
};

function idempotencyKey(scope) {
  return `foundation-gate-${scope}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

async function requestJson(baseUrl, path, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    expectedStatuses = [200],
  } = options;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const raw = await response.text();
  let parsed;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = raw;
  }

  if (!expectedStatuses.includes(response.status)) {
    const detail = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
    throw new Error(`${method} ${path} failed (${response.status}): ${detail}`);
  }

  return parsed;
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function resolveServiceAccessToken(baseUrl, runId, label) {
  const username = `${label}_${runId}`;
  const password = `Gate#${runId}Aa1!`;

  await requestJson(baseUrl, '/api/auth/register', {
    method: 'POST',
    body: { username, password },
    expectedStatuses: [201, 409],
  });

  const login = await requestJson(baseUrl, '/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });

  const token = login?.tokens?.accessToken;
  assertCondition(typeof token === 'string' && token.length > 0, `${label} login did not return access token`);
  return token;
}

async function resolveRecruiterAccessToken(runId) {
  if (config.recruiterAccessToken) {
    return config.recruiterAccessToken;
  }

  return resolveServiceAccessToken(config.recruiterBase, runId, 'recruiter_foundation');
}

async function resolveWalletAccessToken(runId) {
  return resolveServiceAccessToken(config.walletBase, runId, 'wallet_foundation');
}

async function run() {
  const runId = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const recipientEmail = `foundation.${runId}@credverse.test`;
  const recipientDid = `did:key:z6Mk${crypto.randomBytes(16).toString('hex')}`;
  const recruiterAccessToken = await resolveRecruiterAccessToken(runId);
  const walletAccessToken = await resolveWalletAccessToken(runId);
  const recruiterAuthHeaders = {
    Authorization: `Bearer ${recruiterAccessToken}`,
  };
  const walletAuthHeaders = {
    Authorization: `Bearer ${walletAccessToken}`,
  };

  console.log('[Gate] Starting foundation flow: Issue -> Claim -> Present -> Verify -> Revoke');
  console.log(`[Gate] Issuer=${config.issuerBase} Wallet=${config.walletBase} Recruiter=${config.recruiterBase}`);

  const offer = await requestJson(config.issuerBase, '/api/v1/oid4vci/credential-offers', {
    method: 'POST',
    headers: {
      'X-API-Key': config.issuerApiKey,
      'Idempotency-Key': idempotencyKey('offer'),
    },
    body: {
      tenantId: config.tenantId,
      templateId: config.templateId,
      issuerId: config.issuerId,
      recipient: {
        email: recipientEmail,
        name: `Foundation ${runId}`,
        did: recipientDid,
      },
      credentialData: {
        scenario: 'foundation-e2e-gate',
        runId,
        issuedAt: new Date().toISOString(),
      },
      format: 'sd-jwt-vc',
    },
    expectedStatuses: [201],
  });

  const grantType = 'urn:ietf:params:oauth:grant-type:pre-authorized_code';
  const preAuthorizedCode = offer?.credential_offer?.grants?.[grantType]?.['pre-authorized_code'];
  assertCondition(!!preAuthorizedCode, 'Offer did not include pre-authorized code');

  const token = await requestJson(config.issuerBase, '/api/v1/oid4vci/token', {
    method: 'POST',
    body: {
      grant_type: grantType,
      'pre-authorized_code': preAuthorizedCode,
    },
  });

  assertCondition(!!token?.access_token, 'Token endpoint did not return access_token');

  const issued = await requestJson(config.issuerBase, '/api/v1/oid4vci/credential', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'Idempotency-Key': idempotencyKey('credential'),
    },
    body: {
      format: 'sd-jwt-vc',
    },
  });

  const credentialId = issued?.credential_id;
  const credentialJwt = issued?.credential;
  const statusListId = issued?.status?.status_list_id;

  assertCondition(!!credentialId, 'Credential endpoint did not return credential_id');
  assertCondition(!!credentialJwt, 'Credential endpoint did not return credential payload');

  await requestJson(config.walletBase, '/api/wallet/credentials', {
    method: 'POST',
    headers: {
      ...walletAuthHeaders,
    },
    body: {
      userId: config.walletUserId,
      credential: {
        type: ['VerifiableCredential', 'FoundationGateCredential'],
        issuer: 'CredVerse Issuer',
        issuanceDate: new Date().toISOString(),
        jwt: credentialJwt,
        data: {
          credentialId,
          format: issued?.format || 'sd-jwt-vc',
          runId,
        },
      },
    },
  });

  const vpRequest = await requestJson(config.recruiterBase, '/api/v1/oid4vp/requests', {
    method: 'POST',
    headers: { ...recruiterAuthHeaders, 'Idempotency-Key': idempotencyKey('vp-request') },
    body: {
      purpose: 'foundation_e2e_gate',
      state: runId,
    },
    expectedStatuses: [201],
  });

  assertCondition(!!vpRequest?.request_id, 'OID4VP request did not return request_id');

  await requestJson(config.recruiterBase, '/api/v1/oid4vp/responses', {
    method: 'POST',
    headers: { ...recruiterAuthHeaders, 'Idempotency-Key': idempotencyKey('vp-response') },
    body: {
      request_id: vpRequest.request_id,
      state: runId,
      credential: {
        format: issued?.format || 'sd-jwt-vc',
        jwt: credentialJwt,
      },
    },
  });

  const verifyBeforeRevoke = await requestJson(config.recruiterBase, '/api/v1/verifications/instant', {
    method: 'POST',
    headers: { ...recruiterAuthHeaders, 'Idempotency-Key': idempotencyKey('verify-before-revoke') },
    body: {
      jwt: credentialJwt,
      verifiedBy: 'foundation-e2e-gate',
    },
  });

  assertCondition(
    verifyBeforeRevoke?.credential_validity === 'valid' || verifyBeforeRevoke?.verification_id,
    'Instant verification did not return a valid verification payload',
  );

  const revoke = await requestJson(config.issuerBase, `/api/v1/credentials/${encodeURIComponent(credentialId)}/revoke`, {
    method: 'POST',
    headers: {
      'X-API-Key': config.issuerApiKey,
      'Idempotency-Key': idempotencyKey('revoke'),
    },
    body: {
      reason: 'foundation_e2e_gate',
    },
  });

  assertCondition(revoke?.success === true, 'Revoke endpoint did not return success=true');

  const credentialStatus = await requestJson(config.issuerBase, `/api/v1/credentials/${encodeURIComponent(credentialId)}/status`);
  assertCondition(credentialStatus?.revoked === true, 'Credential status is not marked revoked after revoke operation');

  if (statusListId) {
    const statusList = await requestJson(config.issuerBase, `/api/v1/status/bitstring/${encodeURIComponent(statusListId)}`);
    assertCondition(typeof statusList?.bitstring === 'string', 'Status list response missing bitstring');
  }

  await requestJson(config.recruiterBase, '/api/v1/verifications/instant', {
    method: 'POST',
    headers: { ...recruiterAuthHeaders, 'Idempotency-Key': idempotencyKey('verify-after-revoke') },
    body: {
      jwt: credentialJwt,
      verifiedBy: 'foundation-e2e-gate',
    },
  });

  console.log('[Gate] PASS');
  console.log(`[Gate] Credential ID: ${credentialId}`);
  console.log(`[Gate] Status List ID: ${statusListId || 'n/a'}`);
}

run().catch((error) => {
  console.error('[Gate] FAIL');
  console.error(error instanceof Error ? error.message : error);
  if (error instanceof Error && /fetch failed/i.test(error.message)) {
    console.error('[Gate] Hint: start local services first or run `npm run gate:foundation:local`.');
  }
  process.exit(1);
});
