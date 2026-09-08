# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2024-05-24 - Hoisting redundant calculations in unpaginated datasets
**Learning:** Unpaginated datasets on the client-side cause main thread blocking during large dataset rendering if redundant per-item calculations (like `.toLowerCase()`) are not hoisted outside the `.filter` loop.
**Action:** Always wrap array operations (`.filter`, `.map`) in `useMemo` for unpaginated collections and hoist string formatting/redundant operations outside the loops to optimize client-side search.
