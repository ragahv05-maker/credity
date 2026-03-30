# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-03-30 - Database Write Batching
**Learning:** Sequential await calls for DB writes (`storeCredential`) incur linear latency scaling due to repeated I/O blocking. A single batched insert (`storeCredentials`) drastically speeds up multiple credential storage operations (e.g. from 600ms down to 50ms for 10 records).
**Action:** When saving multiple entities sequentially (e.g., during bulk imports from providers like DigiLocker), always search the service layer for a batched alternative method and use it.
