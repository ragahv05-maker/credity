# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-02-25 - Parallelizing Network Operations While Maintaining Write Sequentiality
**Learning:** Network operations like pulling external documents can be safely parallelized using `Promise.allSettled` to drastically reduce request latency in loops. However, subsequent internal database write operations (`storeCredential`) should remain sequential to guarantee data integrity and catch errors accurately.
**Action:** Always scan loops (`for...of`) for operations that can be split into parallel fetching and sequential saving. Apply `Promise.allSettled` on read arrays before writing.
