# Incident Response Runbook (Launch Ops)

## Severity

- **SEV-1:** data loss/leak, full outage, security compromise.
- **SEV-2:** major degradation affecting critical flows.

## First 15 Minutes

1. Declare incident in on-call channel.
2. Assign roles: Incident Commander, Comms, Ops.
3. Freeze deploys.
4. Capture scope: impacted services, time window, user impact.
5. Start timeline log.

## Fast Triage Checklist (all incidents)

- Confirm blast radius:
  - Issuer (`/api/health`)
  - Wallet (`/api/health`)
  - Recruiter (`/api/health`)
  - Gateway (`/api/health`)
- Confirm if this is:
  - **Auth** failure
  - **Queue/deferred mode** issue
  - **Blockchain relayer/anchor** issue
  - **Gateway proxy/routing** issue
- Capture first 5 failing request IDs / timestamps from logs.
- Compare with last deployment/config change window.

## Containment

- Revoke/rotate compromised credentials.
- Enable rate-limit tightening or temporary endpoint block.
- If required, rollback to last known good build.

---

## Incident Playbooks

### A) Auth Failures (401/403 spike, login broken, issuer actions denied)

#### Diagnose

1. Identify failure mode from API responses/logs:
   - 401 style errors (missing/invalid/expired token)
   - 403 style errors (role/authorization policy)
   - API-key vs JWT mismatch
2. Verify runtime auth config parity across services:
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`
   - Any API-key related secrets/env
   - Clock skew on hosts (token expiry false positives)
3. Validate affected route class:
   - read/public vs issuer/admin protected routes
   - queue/revocation/write routes (often stricter)
4. Confirm CORS + cookie/header forwarding at gateway/proxy for auth headers.

#### Remediate

- If secrets drifted, restore known-good secrets consistently to all affected services and restart.
- If role claims changed, hotfix mapping/policy to restore issuer/admin access.
- If gateway strips auth headers, fix forwarding rules and redeploy gateway.
- If expiry/clock skew issue, sync system time and increase short grace window only if approved.

#### Verify

- Re-test login + protected issuer action.
- Check auth success/failure ratio for 15–30 minutes.
- Ensure no unauthorized access was accidentally opened while fixing.

---

### B) Queue / Deferred Mode Incidents (jobs stuck, 503 queue unavailable, DLQ growth)

#### Diagnose

1. Check queue service health and Redis connectivity (`REDIS_URL`).
2. Check queue endpoints:
   - `/v1/queue/stats`
   - `/v1/queue/dead-letter`
3. Classify condition:
   - `QUEUE_UNAVAILABLE` / infra unavailable
   - jobs `stalled` / retry storm
   - DLQ growth after retry exhaustion
4. Confirm anchor mode and queue requirement:
   - `BLOCKCHAIN_ANCHOR_MODE=async`
   - `REQUIRE_QUEUE=true` for production baseline

#### Remediate

- Redis outage/credential issue: restore Redis availability/credentials, restart affected workers.
- Retry storm: throttle inbound bulk issuance and temporarily reduce concurrency.
- DLQ growth: fix root failure cause first, then replay dead-letter entries in batches.
- If queue cannot be restored quickly, switch to controlled degraded mode only with incident commander approval (document exact flag change and window).

#### Verify

- Queue depth trends down.
- No new stalled jobs for 15 minutes.
- Replay success rate acceptable and no duplicate issuance side effects.

---

### C) Blockchain Relayer / Anchor Incidents (queued forever, on-chain submit fails)

#### Diagnose

1. Confirm relayer key/config present and valid:
   - `RELAYER_PRIVATE_KEY` format and correct secret version
   - `CHAIN_NETWORK`, RPC URL envs
2. Check RPC/network health for selected chain.
3. Classify error:
   - key/permission/signing failure
   - RPC timeout/rate limit
   - gas/nonce/chain-specific policy rejection
4. Inspect pending anchors:
   - queued vs submitted vs failed counts (from service logs/DB status)

#### Remediate

- Restore relayer key secret version or rotate to approved key.
- Fail over to healthy RPC endpoint.
- Increase retry backoff for RPC flakiness; avoid tight-loop retries.
- For nonce conflicts, pause relayer briefly, reconcile nonce, then resume.
- If mainnet writes are blocked by policy flags (e.g. zkEVM control), restore approved flag state.

#### Verify

- New anchor requests move through queued → submitted → confirmed.
- Failed anchors are replayed/retried safely.
- No chain/network mismatch remains in runtime config.

---

### D) Gateway Proxy Incidents (502/504, auth callback loop, CORS/header breakage)

#### Diagnose

1. Check gateway health and upstream reachability.
2. Validate proxy/routing targets for issuer, wallet, recruiter APIs.
3. Confirm forwarded headers:
   - `Authorization`
   - `X-Forwarded-*`
   - host/proto expected by callbacks
4. Validate OAuth callback settings against deployed gateway URL.
5. Check CORS origin list (`ALLOWED_ORIGINS`) matches current domains.

#### Remediate

- Restore correct upstream base URLs and routing rules.
- Fix header pass-through in proxy layer (especially auth header).
- Correct OAuth redirect URI mismatch and restart gateway.
- Reapply known-good CORS settings and clear stale CDN/proxy config if any.

#### Verify

- End-to-end login works through gateway.
- Protected API calls via gateway succeed.
- 5xx rate returns to baseline.

---

## Recovery

- Restore service health (`/api/health` all green).
- Verify key user journeys (issue/claim/verify/revoke).
- Monitor errors/latency for 30 minutes after fix.

## Compliance Notifications

- If incident is reportable, create CERT-In record and track `report_due_at`.
- Export audit evidence for legal/compliance review.

## Exit Criteria

- Error rate and latency return to baseline.
- Stakeholder update sent.
- Postmortem owner/date assigned (< 48h).
