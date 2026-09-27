# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2024-05-24 - Unpaginated Dataset Filtering
**Learning:** Client-side filtering of unpaginated datasets blocks the main thread with redundant calculations (like .toLowerCase()) on every render.
**Action:** Always wrap array operations (.filter, .map) in useMemo and hoist invariant per-item calculations outside the loop.
