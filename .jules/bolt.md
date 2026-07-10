# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2024-03-22 - Memoizing Filtered Arrays in React
**Learning:** Extracting string manipulation methods (like `.toLowerCase()`) outside of array iterators inside a useMemo block significantly improves performance for large datasets.
**Action:** Always memoize derived data from arrays, and always check if loop-internal computations can be hoisted to scope outside the loop.
