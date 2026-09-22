# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2024-03-22 - Unpaginated Datasets Client-side Filtering
**Learning:** In this codebase, collections like records are fetched entirely without pagination. Filtering them synchronously on every render and running repetitive string calculations (like `.toLowerCase()`) per property for every item blocks the main thread heavily on large datasets.
**Action:** Always wrap array operations (`.filter`, `.map`) in `useMemo` and hoist redundant per-item calculations outside the loop when dealing with unpaginated data in this application.
