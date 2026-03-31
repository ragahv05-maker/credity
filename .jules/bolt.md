# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-03-31 - Optimize Bulk Insertions with Batch Processing
**Learning:** Sequential, iterative database or file-system writes in loops (like storing credentials one by one) cause significant performance bottlenecks due to redundant I/O operations and event triggers. Batch processing can significantly decrease latency and resource usage.
**Action:** When inserting multiple records, always check if the service layer has a batch method (e.g., `storeCredentials` vs `storeCredential`) that combines the writes into a single persist operation. Replace loop insertions with batch processing wherever possible.
