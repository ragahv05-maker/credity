# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2025-02-26 - Batch Wallet Credential Insertion
**Learning:** Sequentially awaiting `walletService.storeCredential` in a loop during bulk import (e.g., from DigiLocker) causes an N+1 performance bottleneck and repeated state persistence.
**Action:** Always use `walletService.storeCredentials` for batch insertion instead of sequentially awaiting single store operations.
