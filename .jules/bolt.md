# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2024-05-18 - Client-Side Unpaginated Filtering
**Learning:** This codebase frequently fetches unpaginated datasets (like records or students) entirely to the client. Filtering these on every render with redundant per-item calculations (like `.toLowerCase()`) blocks the main thread.
**Action:** Always wrap client-side `.filter()` and `.map()` operations in `useMemo` for large datasets and hoist invariant calculations outside the iteration loop.
