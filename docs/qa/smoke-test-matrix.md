# Smoke Test Matrix

## Core checks (must pass post-deploy)

1. Auth login/refresh
2. Issuance happy path
3. Wallet claim/store/share happy path
4. Recruiter verify happy path
5. Health/readiness endpoints

## Execution

- Run in staging before production promotion
- Run after each canary step for high-risk releases
