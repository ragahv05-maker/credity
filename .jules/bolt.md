# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2025-03-01 - Parallelizing Remote API Fetches
**Learning:** Sequential remote API reads (like document fetching in a loop) create a massive N+1 performance bottleneck. Using `Promise.allSettled()` can drastically reduce network wait times.
**Action:** Always check if loops containing asynchronous remote fetch operations can be parallelized, while being careful to leave database write operations sequential to ensure data integrity and proper error propagation.
