# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-03-14 - Batch Insertion Optimization
**Learning:** Sequential `storeCredential` calls in a loop cause an N+1 performance bottleneck by sequentially queueing persistence operations (`queuePersist`). Using the batch operation `storeCredentials` performs a single persist at the end for all credentials, which provides a performance improvement.
**Action:** Always use batch operations (like `storeCredentials`) for operations that persist data, instead of sequentially awaiting in a loop.
