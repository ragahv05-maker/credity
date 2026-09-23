# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2024-05-20 - Unpaginated Collections Performance
**Learning:** This codebase fetches some collections (like records and students) entirely without pagination, causing the main thread to block during client-side filtering of large datasets due to repeated calculations like `.toLowerCase()`.
**Action:** Always wrap array operations (`.filter`, `.map`) in `useMemo` and hoist redundant calculations outside the loop when optimizing client-side filtering for these unpaginated collections.
