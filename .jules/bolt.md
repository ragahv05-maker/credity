# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-02-25 - Promise.all over Sequential Await for Bulk Work
**Learning:** Using `for...of` loops with `await` inside them processes elements sequentially, introducing severe bottlenecks for independent network/database-bound tasks.
**Action:** Always check if iterations can be mapped to promises and run concurrently via `Promise.all` when order or state dependency is not required.
