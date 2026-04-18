# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2026-04-18 - Promise.all Optimization
**Learning:** Sequential await calls for independent data queries (like storage list operations) create an unnecessary N+1 waterfall bottleneck during report generation.
**Action:** When making multiple independent async queries to build a dashboard or report, always combine them into a single `Promise.all` array to execute them concurrently, reducing total wait time from O(n) to O(max(n)).
