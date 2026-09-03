# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2024-06-25 - Unpaginated Client-Side Filtering Bottleneck
**Learning:** In collections fetched entirely without pagination (like credentials/records), array operations like `.filter` and `.map` performed directly in the render body block the main thread and cause noticeable lag, especially when doing redundant string operations like `.toLowerCase()` per item.
**Action:** Always wrap unpaginated dataset filtering in `useMemo` and hoist redundant calculations (like `search.toLowerCase()`) outside the loop to optimize client-side rendering performance.
