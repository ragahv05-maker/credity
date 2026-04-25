# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-02-24 - Batching Persistence Operations in WalletService
**Learning:** Sequential calls to `walletService.storeCredential` trigger N+1 queries due to repeated `queuePersist` operations, which significantly impacts backend performance.
**Action:** Always use `walletService.storeCredentials` for batch persistence operations to avoid N+1 queries when saving multiple credentials simultaneously.
