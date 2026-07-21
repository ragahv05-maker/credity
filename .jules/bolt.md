# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2025-07-21 - Memoizing Expensive List Filtering
**Learning:** In large React list views (like `Records.tsx`), recalculating filters on every render (even when dependencies like search terms haven't changed) causes unnecessary processing and degrades scrolling/interaction performance.
**Action:** Use `useMemo` to cache the results of list filtering operations, especially those involving string manipulation (like `.toLowerCase()`) and multiple nested property checks. Extract invariant operations like converting the search term to lowercase outside the `.filter` loop to prevent redundant computation per item.
