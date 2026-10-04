# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2024-10-04 - Memoizing Client-Side Array Operations
**Learning:** Client-side filtering of unpaginated datasets causes synchronous main-thread blocking when rendering typing input, due to repeating redundant array/string operations (like calling `.toLowerCase()` continuously within a `.filter()` loop).
**Action:** Always wrap client-side dataset filtering in `useMemo` and hoist redundant computations out of the inner loop to preserve 60fps interaction during unpaginated dataset search.
