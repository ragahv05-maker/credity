# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2026-02-24 - Parallelized Independent Data Fetches
**Learning:** Sequential independent `await` calls in report generation endpoints linearly increase response time. Parallelizing them with `Promise.all` bounds the wait time to the slowest query.
**Action:** Always identify independent asynchronous operations and wrap them in `Promise.all` to optimize backend response times.
