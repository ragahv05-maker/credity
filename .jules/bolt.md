# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2024-05-18 - Unpaginated Data Filtering Optimization
**Learning:** In unpaginated datasets like 'Records', recalculating arrays and transforming strings inside `.filter()` blocks the main thread on every render.
**Action:** Always wrap array filtering in `useMemo` and hoist redundant operations (like `toLowerCase()`) outside the loop for large data sets.
