# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-02-24 - Batch Credential Insertion
**Learning:** Sequentially awaiting `walletService.storeCredential` in a loop causes an N+1 performance bottleneck during credential imports or batch operations.
**Action:** Always use `walletService.storeCredentials` for batch insertion instead of sequential loops.
