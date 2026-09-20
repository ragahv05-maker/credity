# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-02-24 - Unpaginated Collections Filtering
**Learning:** The backend returns some collections (like records) entirely without pagination. Unoptimized client-side filtering blocks the main thread during large dataset rendering due to redundant calculations per-item.
**Action:** Always wrap client-side array operations (`.filter`, `.map`) in `useMemo` and hoist redundant per-item calculations (like `.toLowerCase()`) outside the loop for unpaginated datasets.
