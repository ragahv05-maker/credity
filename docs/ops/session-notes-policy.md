# Session Notes Policy (Mandatory)

Effective: 2026-02-19
Owner: Credity Delivery Office

## Rule
Every active implementation session must maintain a running session note with:
1. Timestamp (IST)
2. Lane/department (Security, Platform/SRE, QA/Release, Backend, ZK/Contracts, Product)
3. Action taken
4. Evidence (command/log/file)
5. Status (DONE/IN_PROGRESS/BLOCKED)
6. Next step

## Requirements
- Notes must be append-only during the session.
- No claim of completion without evidence link/command output.
- Final status must include:
  - Completed
  - Not completed
  - Risks
  - ETA remaining

## File location
- Current session log: `swarm/reports/session-notes-2026-02-19.md`
- Historical logs remain in `swarm/reports/`.

## Enforcement
- Before every user-facing milestone update, add a note entry first.
- If evidence is missing, status must be `IN_PROGRESS` or `BLOCKED`, never `DONE`.
