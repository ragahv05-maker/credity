# Restore Runbook

## Preconditions

- Known backup snapshot identifier
- Isolated restore environment
- Integrity checks defined

## Procedure

1. Restore snapshot to isolated environment.
2. Run schema and data integrity checks.
3. Run smoke suite against restored system.
4. Record restore time vs RTO and data gap vs RPO.
5. Publish drill report and remediation actions.
