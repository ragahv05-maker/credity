# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-02-24 - Array Iteration Performance in React
**Learning:** In unpaginated React lists (like `filteredRecords`), computing values like `search.toLowerCase()` inside a `.filter` or `.map` loop forces O(n) redundant calculations on every render.
**Action:** Always wrap expensive list derivations in `useMemo` and hoist invariant computations (like search normalization) outside the iteration loop to prevent main thread blocking during large dataset rendering.
