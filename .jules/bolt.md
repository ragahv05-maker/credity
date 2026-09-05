# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2024-05-24 - Unpaginated Collection Filtering
**Learning:** Unpaginated datasets like 'credentials' being filtered without memoization block the main thread by recalculating strings per item on every render.
**Action:** Always wrap client-side array filters for unpaginated collections in useMemo and hoist redundant calculations like .toLowerCase() outside the loop.
