# AEOS Project Memory — Credity

This folder is the isolated institutional memory for the Credity project.

## Rules

- Keep project-specific memory here only.
- Decision logs are append-only.
- Use templates for structured records.

## Core Paths

- Strategic_Memory/
- Operational_Memory/
- Departmental_Memory/
- Decision_Logs/

## Root-Fix Discipline

- Framework: `Departmental_Memory/Engineering/root-fix-framework-v1.md`
- Incident template: `Templates/RootFixIncident.md`
- Guard command (repo root): `npm run gate:root-fix`

## Shutdown-Resilience Database

- SQLite DB path: `Operational_Memory/aeos_resilience.sqlite`
- Sync command (from repo root): `npm run aeos:sync-db`
- Source of truth remains markdown logs; DB is an indexed mirror for fast recovery/search after restarts.
