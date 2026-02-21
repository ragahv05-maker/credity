# Secrets Policy (Credity)

## Goal

Keep all production secrets centralized, rotated, and never committed to git.

## Rules

1. No plaintext secrets in repo, PRs, issues, or logs.
2. Use managed secret store (Vault/AWS/GCP/1Password Connect) as source of truth.
3. CI should use OIDC/workload identity where possible; avoid long-lived static credentials.
4. All secrets require owner, purpose, TTL, and rotation schedule.
5. Any suspected exposure triggers immediate rotation + incident process.

## Required inventory fields

- secret_name
- service
- environment
- owner
- created_at
- rotate_by
- last_rotated_at
- blast_radius

## Enforcement

- Pre-commit secret scan enabled.
- CI secret scan is fail-closed.
- Quarterly rotation baseline; emergency rotation on exposure.
