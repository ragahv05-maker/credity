# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2025-04-06 - Concurrent Bulk Imports with Error Handling
**Learning:** When refactoring sequential loops into parallel operations (e.g., using `Promise.allSettled`), preserving error handling by mapping the original items index to the promise results ensures that individual task failures do not break the whole operation or lose context (such as identifying which exact document failed to import).
**Action:** When using `Promise.allSettled`, match `results` back to the source array using index or attach context directly in the mapped promise to preserve fine-grained error and success tracking.