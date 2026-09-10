# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2026-02-24 - Unpaginated Collection Filtering
**Learning:** In this codebase, collections like records are fetched without pagination, making client-side filtering of large arrays a significant main-thread bottleneck.
**Action:** Always wrap client-side `.filter()` and `.map()` operations for datasets in `useMemo`, and hoist redundant per-item calculations (like `.toLowerCase()`) outside the loop to minimize performance impact.
