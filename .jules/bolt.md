# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2026-02-24 - Memoize Invariant Computations
**Learning:** Moving string operations (like `toLowerCase()`) outside of `.filter()` callbacks prevents redundant computation, especially when combined with `useMemo` to avoid re-calculating filtered lists on unrelated renders.
**Action:** Always extract invariant computations (like converting search queries to lower case) outside of iterator loops like `.map` or `.filter`.
