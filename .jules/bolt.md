# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2023-10-25 - Parallelize Independent Backend Fetches
**Learning:** Complex reporting endpoints (like reputation summary) often sequentially fetch independent data components (e.g., SafeDate snapshot and recent events), causing unnecessary waterfall delays.
**Action:** Always parallelize independent read operations (such as `calculateReputationScore`, `storage.getUser`, and `deriveSafeDateInputs`) using `Promise.all` to minimize request latency.
