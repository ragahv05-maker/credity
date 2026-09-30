# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2023-10-24 - Unpaginated Collection Bottlenecks
**Learning:** Core collections (like records and students) are fetched entirely without pagination. Any O(N) client-side operations (like filtering or sorting) on these datasets can severely block the main thread if not carefully optimized.
**Action:** Always wrap array operations (.filter, .map) in useMemo and hoist redundant per-item calculations (e.g., .toLowerCase()) outside the loop when dealing with these large, unpaginated collections.
