# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2024-09-17 - Client-side Filtering Performance
**Learning:** Unpaginated datasets filtered on the client side without `useMemo` and with redundant per-item `.toLowerCase()` calls block the main thread and cause sluggish search input.
**Action:** Always wrap unpaginated dataset array operations in `useMemo` and hoist redundant calculations outside the loop.
