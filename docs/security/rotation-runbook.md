# Secret Rotation Runbook

## Trigger

- Scheduled rotation date OR incident/exposure signal.

## Steps

1. Create replacement secret in manager.
2. Update staging bindings, deploy, and run smoke tests.
3. Update production bindings with canary rollout.
4. Validate service health + auth flows.
5. Revoke old secret and confirm denied usage.
6. Update inventory and evidence log.

## Evidence

- Rotation timestamp
- Owner approval
- Smoke test pass output
- Old secret revocation proof
