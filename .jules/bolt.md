# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2024-05-15 - Unpaginated Collections Filtering
**Learning:** In this codebase, collections like records or students are fetched entirely without pagination. Doing string conversions inside render-blocking `.filter()` loops on every keystroke causes main thread blocking for these large datasets.
**Action:** When optimizing client-side unpaginated datasets, always wrap array operations in `useMemo` and hoist redundant per-item calculations (like `.toLowerCase()`) outside the loop.
