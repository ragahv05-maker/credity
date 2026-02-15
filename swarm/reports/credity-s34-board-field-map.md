# Credity S34 — Master Board Field Map (CSV/Notion/Jira)

## Required fields
- ID
- Lane (`Now`, `Next`, `This Week`, `Week 2`, `Blocked`, `Done`)
- Title
- Workstream
- DRI
- Deputy
- Priority (`P0`,`P1`,`P2`)
- RAG (`Red`,`Amber`,`Green`)
- ImpactHypothesis
- DueIST
- Dependencies
- DefinitionOfDone
- ControlGateNeeded (`Y`/`N`)
- ControlGate
- RollbackPlan
- Status
- LastUpdatedIST

## Governance rules
1. One task = one DRI.
2. Any `Blocked` item >4h auto-escalates to Dependency SWAT.
3. No production-impacting task can move to Done without `DefinitionOfDone` evidence.
4. `P0 + Red` tasks are reviewed first in control-room cadence.
