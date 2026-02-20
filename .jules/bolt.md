## 2026-02-20 - [Restoring Lost Optimization]
**Learning:** A failing benchmark test (`tests/wallet-service-benchmark.test.ts`) called a non-existent method `storeCredentials` (batch), expecting it to be 10x faster than sequential `storeCredential`. Implementing this method fixed the test and unlocked the expected performance gain (52ms vs 612ms for 10 items).
**Action:** Treat failing benchmark tests as a roadmap for high-value optimizations. Sometimes the code for the optimization is missing, but the intent (and the test for it) remains.
