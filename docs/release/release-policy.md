# Release Policy

## Principles

- Immutable artifacts only.
- Progressive delivery (canary/blue-green).
- Rollback must be tested and documented.

## Mandatory CI gates

1. lint + unit
2. dependency/SAST
3. container + IaC scans
4. integration tests
5. staging smoke tests
6. release approval gate

## Go/No-Go

Release only when all required gates pass and no critical/high vulnerabilities remain unresolved without time-bound waiver.
