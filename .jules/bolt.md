# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2024-05-18 - Batch Insertion over Sequential Await
**Learning:** In `BlockWalletDigi`, replacing sequential `await walletService.storeCredential` calls within loops with a single batched `await walletService.storeCredentials` call significantly reduces execution time (resolving an N+1 performance bottleneck during bulk import operations). The benchmark showed a drop from ~61.4ms to ~5.2ms per credential.
**Action:** When handling arrays of items that require persistence (e.g., bulk credential imports or batch operations), always look for or create batched service methods (`storeCredentials`) rather than relying on `for` loops with individual `await` calls.
