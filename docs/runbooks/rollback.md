# Rollback Runbook

## Preconditions

- Last known good release artifact/version recorded.
- DB migration rollback or forward-fix path confirmed.
- Incident commander approval for rollback decision.

## Procedure

1. Announce rollback start in release channel.
2. Deploy previous known-good artifact for each affected service.
3. Re-run health checks:
   - Issuer: `/api/health`
   - Wallet: `/api/health`
   - Recruiter: `/api/health`
   - Gateway: `/api/health`
4. Run smoke tests for issue/claim/verify flow.
5. Confirm metrics stabilized (errors, latency, auth success).

---

## Scenario-Specific Rollback Guidance

### A) Auth rollback

- Roll back auth-impacting services first (usually gateway + issuer API).
- Restore previous secret set if the incident was caused by secret drift:
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`
- Re-validate role-gated endpoints (issuer/admin) after rollback.
- If rollback restores access, freeze auth-related config changes until root cause is closed.

### B) Queue / deferred mode rollback

- Roll back queue worker + issuer API as a pair to avoid contract mismatch.
- Confirm `REQUIRE_QUEUE` and `BLOCKCHAIN_ANCHOR_MODE` are set to last known-good values.
- Before replaying DLQ entries, ensure root failure is gone; replay in controlled batches.
- If queue remains unstable after app rollback, treat as infrastructure incident (Redis/network) and do not blindly replay.

### C) Blockchain relayer rollback

- Roll back relayer logic and restore prior relayer secret version if needed.
- Validate chain config parity after rollback:
  - `CHAIN_NETWORK`
  - RPC URL envs
  - `RELAYER_PRIVATE_KEY`
- Reconcile in-flight anchor states (`queued/submitted/failed`) before resuming full throughput.

### D) Gateway proxy rollback

- Roll back gateway config + artifact together (routing + auth callback behavior are coupled).
- Restore known-good upstream mappings and header forwarding rules.
- Verify OAuth callback URL and CORS origins post-rollback.

---

## Post-Rollback Validation Matrix

- **Auth:** login success, protected action success, no 401/403 spikes.
- **Queue:** stats endpoint healthy, no rapid stalled-job growth, DLQ not increasing unexpectedly.
- **Relayer:** new anchor transaction reaches submitted/confirmed path.
- **Gateway:** no 502/504 burst, auth callback works, upstream APIs reachable.

## Completion

- Mark rollback complete with timestamp.
- Link incident/release ticket.
- Record exact artifacts + config versions restored.
- Begin root-cause + corrective action.
