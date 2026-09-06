# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2026-02-24 - Unpaginated Collection Filtering
**Learning:** In unpaginated client-side datasets like records, wrapping array operations (`.filter`, `.map`) in `useMemo` and hoisting redundant per-item calculations (like `.toLowerCase()`) outside the loop prevents main thread blocking during large dataset rendering.
**Action:** Always wrap client-side filtering of large lists in `useMemo` and extract redundant operations outside the loop.
