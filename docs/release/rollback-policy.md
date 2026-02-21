# Rollback Policy

## Auto-rollback triggers

- Smoke test failure after deploy
- SLO burn-rate threshold breach
- Error-rate spike above guardrail

## Manual rollback triggers

- Security incident
- Data correctness regression
- Business-critical flow failure

## Rollback requirements

- Previous stable artifact available
- Backward-compatible DB migration strategy (expand/contract)
- Incident channel announcement + timeline log
