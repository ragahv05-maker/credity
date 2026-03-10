# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-03-10 - O(N) Array Summary Accumulation
**Learning:** Using multiple `.filter()` calls to compute aggregate UI summaries from a single large array (e.g. `results`) is computationally expensive as it iterates the list multiple times. In a React render loop or memo hook, doing 6 consecutive iterations results in O(6N) complexity, significantly hindering rendering performance on huge datasets (like 100k rows in `BulkVerify.tsx`).
**Action:** When deriving multiple aggregations from an array, combine them into a single `reduce` pass (O(N) complexity) or use an explicit for-loop instead of chaining `.filter().length`.
