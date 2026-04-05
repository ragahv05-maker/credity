# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2024-04-05 - Batching wallet credential persistence
**Learning:** Calling `storeCredential` inside a loop sequentially triggers independent filesystem IO/saves.
**Action:** Use `storeCredentials` array method instead to batch the inserts and do a single persistence pass.
