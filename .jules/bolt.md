# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-10-28 - Missing useMemo for expensive filter operations on large lists
**Learning:** React re-evaluates expensive `.filter()` and string transformations on every render if not memoized, which impacts performance on frequently updated pages like lists with a search bar.
**Action:** Always wrap `.filter()` operations on arrays with `useMemo` when they depend on state (like a search input) and ensure expensive string methods inside the loop are hoisted out if possible.
