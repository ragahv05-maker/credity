# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2024-05-23 - Client-side Filtering of Unpaginated Datasets
**Learning:** In this codebase, several large collections (like records or students) are fetched entirely without pagination. Unoptimized client-side filtering blocks the main thread during typing and re-renders.
**Action:** Always wrap array operations (.filter, .map) in useMemo and hoist redundant per-item calculations (like .toLowerCase()) outside the loop when dealing with these datasets.
