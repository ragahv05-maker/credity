# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2023-10-27 - Reduce Passes for Array Transformations
**Learning:** Chaining multiple `.filter()` or `.map()` methods creates multiple iteration passes over arrays, turning what could be O(n) operations into O(k * n). In performance-critical areas like processing large CSV batches in `BulkVerify.tsx`, this noticeably degrades UI responsiveness.
**Action:** Replace chained `.filter()` and similar multi-pass array methods with a single `.reduce()` pass when possible to calculate summaries or aggregations.
