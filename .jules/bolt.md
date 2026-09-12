# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2024-09-12 - Hoisting calculations and Memoizing unpaginated list filtering
**Learning:** When client-side filtering unpaginated collections in this codebase, failing to wrap array operations like `.filter` and `.map` in `useMemo` causes redundant main thread blocking. Also, redundantly executing `.toLowerCase()` inside the filter iteration significantly degrades performance on large datasets.
**Action:** Always hoist redundant per-item calculations (like `.toLowerCase()`) outside the loop and wrap the entire client-side array operation in `useMemo`.
