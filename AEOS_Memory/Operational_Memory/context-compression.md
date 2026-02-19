# Context Compression (High-Signal)

- **Project:** Credity (monorepo) — issuer + wallet + recruiter/verifier + public gateway; shared auth module.
- **Strategic intent:** India-first verification + fraud prevention (“UPI for trust”) with **W3C DID/VC** compatibility and **ZK-native** trajectory; **evidence-before-claim** is non-negotiable.
- **Release reality:** Currently **NO-GO** until P0 gates are green.
- **Primary technical blocker:** **foundation gate nonce mismatch** in OID4VP response flow (must reproduce deterministically, patch, and re-run gates).
- **Evidence gap:** hosted launch / contract-security evidence freshness needs to match current release SHA (link artifacts to board).
- **External blockers:** prod secrets/secret manager, hosting/domain/DNS creds, irreversible chain/wallet signing approvals.
- **Operating cadence:** keep decisions + state inside `AEOS_Memory`; weekly compaction; update immediately after any material code/release decision.
