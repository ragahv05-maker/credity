# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-03-29 - Code Review Hallucinations
**Learning:** The code review tool occasionally hallucinates that a method (like `storeCredentials`) is not implemented when it actually exists and is tested.
**Action:** Always independently verify code existence using bash commands before acting on code review feedback.
