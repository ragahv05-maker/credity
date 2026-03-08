# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2024-05-24 - Hidden O(N²) Write Penalty in Bulk Operations
**Learning:** Saving full-state objects (like large cache maps) in a loop during bulk operations (e.g., `bulkVerify` calling `queuePersist` for every credential) causes terrible O(N²) write complexity and severe performance degradation.
**Action:** When performing bulk operations that modify state, add a `skipPersist` flag to individual operations, defer the persistence step, and only trigger a single persistence save at the very end of the bulk operation.
