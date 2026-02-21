# DB Migration Safety

Use expand/contract pattern only:

1. Expand schema in backward-compatible way.
2. Deploy app supporting old + new schema.
3. Backfill safely with progress checkpoints.
4. Cut reads/writes to new schema.
5. Contract old columns/tables in later release.

Never combine destructive schema drops with same-release app changes.
See also: `docs/DB_MIGRATION_SAFETY.md`.
