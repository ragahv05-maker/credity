# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2024-05-24 - Unpaginated Collections Pattern
**Learning:** In this codebase, some collections (like records or students) are fetched entirely without pagination, which can block the main thread when filtering large datasets on the client side.
**Action:** When optimizing these unpaginated datasets on the client-side, always wrap array operations (`.filter`, `.map`) in `useMemo` and hoist redundant per-item calculations (like `.toLowerCase()`) outside the loop.
