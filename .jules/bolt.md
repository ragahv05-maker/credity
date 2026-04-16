# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2026-02-24 - N+1 Persistence Bottleneck
**Learning:** Sequential loops calling `storeCredential` cause an N+1 persistence bottleneck because each call executes its own `queuePersist()`.
**Action:** Always batch related store operations using `storeCredentials()` to execute a single `queuePersist()` and minimize IO wait time.
## 2026-04-16 - Handling CI Dependency Security Check Failures
**Learning:** Fixing security vulnerabilities using `npm install --legacy-peer-deps` may occasionally cause a massive `package-lock.json` generation leading to CI rejection, but is necessary for fixing CI Check Suite Failures. If a previous action generated invalid states in `package.json` overrides, explicit updating of `dependencies` along with the `overrides` or direct dependency upgrade without overrides is safer.
**Action:** Always prefer updating direct dependencies securely when resolving `npm audit` alerts and run tests locally first to ensure lock files sync correctly.
