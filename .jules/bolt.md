# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2024-05-24 - Unpaginated Client-Side Filtering Optimization
**Learning:** In CredVerseIssuer 3, collections like credentials in `Records.tsx` are fetched entirely without pagination and filtered client-side. The filtering logic originally performed redundant `O(N)` lowercasing string allocations on every render for every field, even when the search input was empty or unrelated component state triggered a re-render.
**Action:** When working with unpaginated datasets on the client side, always wrap `.filter` operations in `useMemo`, add an early return for empty filters, and hoist static calculations (like `search.toLowerCase()`) outside the iteration loop to prevent main thread blocking and unnecessary recalculations.
