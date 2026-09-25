# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2026-02-24 - Hoisted Loop Variables in Unpaginated Client Filtering
**Learning:** Hoisting redundant calculations like `.toLowerCase()` outside of array iteration (`.filter`/`.map`), combined with `useMemo`, significantly improves client-side filtering speed for unpaginated datasets by avoiding O(N) recalculations and unnecessary re-renders.
**Action:** Always hoist invariant string transformations outside of array iteration blocks and memoize the array when rendering unpaginated lists.
