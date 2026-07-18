# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2026-03-02 - Hoisted Filters and Memoized Stats
**Learning:** React re-renders can trigger expensive O(N) or O(3N) multiple array iterations when deriving stats from arrays (like filtering teams by roles). String manipulation inside filters (like `toLowerCase()`) also causes redundant allocations on every iteration.
**Action:** Always wrap derived array stats in `useMemo` and hoist constants/transformations out of the filter loop.
