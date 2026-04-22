# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-02-24 - Batched Persistence in DigiLocker Import
**Learning:** Sequential DB queue writes (N+1 problem) during bulk credential imports caused significant performance degradation. The wallet service provides a `storeCredentials` method specifically to batch these persistence operations.
**Action:** Always use batched storage methods (like `storeCredentials`) instead of looping over single storage methods (`storeCredential`) when handling arrays of data to reduce DB/disk I/O bottlenecks.
