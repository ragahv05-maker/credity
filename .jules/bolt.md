# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2024-05-24 - Unpaginated Dataset Filtering Blocks Main Thread
**Learning:** In this codebase, collections like records are fetched entirely without pagination. Unoptimized client-side filtering on these large unpaginated arrays (recalculating `.toLowerCase()` on every iteration without memoization) blocks the main thread and causes UI lag during search.
**Action:** Always wrap array operations (`.filter`, `.map`) in `useMemo` and hoist redundant per-item calculations (like `.toLowerCase()`) outside the loop when dealing with unpaginated datasets on the client side.
