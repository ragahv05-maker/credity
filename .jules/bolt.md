# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2024-04-08 - Parallelize Independent Network Reads but Sequence Writes
**Learning:** When refactoring sequential loops into parallel operations (`Promise.allSettled()`), you must ensure that error handling and context (like `doc.name`) are preserved. Furthermore, database write operations must remain sequential if they rely on specific error handling flows to maintain data integrity.
**Action:** Use `Promise.allSettled()` with an inner `try-catch` wrapper mapping to capture both success data and context for failures, allowing safe parallel reads while processing the results and subsequent writes sequentially.
