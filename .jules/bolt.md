# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2025-02-13 - [Missing Memoization on Filtered Records]
**Learning:** Found an unnecessary re-computation of `filteredRecords` and `filteredTemplates` in `Records.tsx` and `Templates.tsx` which can be optimized with `useMemo` to prevent filtering on every render.
**Action:** Always wrap computationally expensive filtering operations in `useMemo` when they depend on specific state like search terms or dataset arrays.
