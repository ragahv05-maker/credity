# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-02-24 - Batched Credential Persistence
**Learning:** Sequential calls to `walletService.storeCredential` in loops trigger an N+1 performance bottleneck due to repeated `queuePersist` calls in this codebase.
**Action:** Always use `walletService.storeCredentials` for batch operations to optimize persistence into a single queue operation.
