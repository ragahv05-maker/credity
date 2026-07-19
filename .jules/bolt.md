# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2025-03-09 - Memoize expensive filtering in Records page
**Learning:** Found an unmemoized filtering operation `filteredRecords` in `CredVerseIssuer 3/client/src/pages/Records.tsx` that filters a list of credentials based on a search string on every render. Because the search filtering was running synchronously in the render cycle, this would cause unnecessary processing and potential lag as the list of records grows.
**Action:** Replaced the direct array filter and multiple `toLowerCase()` calls with a `useMemo` block that first caches `search.toLowerCase()` as `lowerSearch`, and computes the filtered list only when `credentials` or `search` dependencies change. This reduces redundant calculations and prevents unnecessary re-renders.
