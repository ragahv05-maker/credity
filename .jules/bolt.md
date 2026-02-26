# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-02-26 - React List Virtualization & Memoization
**Learning:** Extracting list rows into `React.memo` components prevents entire list re-renders when parent state (like a detail dialog) changes, which is critical for performance in large data tables.
**Action:** When building data tables with interactive rows (e.g., "View Details"), always extract the row component and memoize the callback handler to ensure stable props.
