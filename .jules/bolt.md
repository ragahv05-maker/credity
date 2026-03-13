# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2025-02-24 - Avoid N+1 Sequential Processing using Batched Queries
**Learning:** In `BlockWalletDigi`, to avoid N+1 performance bottlenecks during credential imports or batch operations, always use `walletService.storeCredentials` for batch insertion instead of sequentially awaiting `walletService.storeCredential` in a loop.
**Action:** Replace `for` loop sequential `await` operations with native bulk database operations like `walletService.storeCredentials` when handling array data processing in backend API endpoints.