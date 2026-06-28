# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2024-06-28 - String Operations in Loops
**Learning:** Extracting string operations (like `toLowerCase()`) outside of array filter loops, combined with `useMemo`, significantly reduces redundant computations and CPU time per render cycle, especially for large datasets.
**Action:** Always verify that loop invariants (like transforming search strings) are hoisted out of `.filter` or `.map` iterations.
