# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2025-02-28 - Caching derived state outside loops
**Learning:** Calling functions like `toLowerCase()` repeatedly inside array iteration methods (like `filter` or `map`) causes redundant computations and slows down rendering, especially with large datasets and multiple string manipulations per item.
**Action:** Always cache derived state (like a lowercased search term) outside the loop to prevent recalculating it on every iteration.
