# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2026-02-24 - Redundant Array Method Transformations
**Learning:** Performing static transformations (like string `.toLowerCase()`) inside `.map()` or `.filter()` callbacks causes redundant recalculations (O(N) overhead). In React, unmemoized derived state combined with redundant inner loop allocations can cause severe main thread blocking for large lists.
**Action:** Always hoist invariant string or object transformations outside of iteration callbacks, and wrap complex filtering operations in `useMemo`.
