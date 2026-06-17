# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-02-24 - React List Filtering
**Learning:** Performing string manipulation (like `.toLowerCase()`) directly inside synchronous `Array.prototype.filter()` loops running on every render for large datasets introduces unnecessary O(N) operations and causes noticeable render lag.
**Action:** Always wrap expensive or repetitive list filtering logic in `useMemo` with proper dependencies, and hoist common static operations (like input formatting) completely outside the `.filter` callback to execute only once.
