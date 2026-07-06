# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-03-01 - Avoid Over-Fetching in Aggregation Queries
**Learning:** In Drizzle/Postgres endpoints computing reputations, fetching entire rows (select()) and mapping in memory scales poorly compared to projecting only required columns.
**Action:** Always restrict select() statements to only the columns necessary for aggregation (like category, score, and signalType) to prevent excess memory allocation and unnecessary JS loops.
