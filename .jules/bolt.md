# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.

## 2026-02-24 - React.memo for List Items
**Learning:** Wrapping complex list item components (like `CredentialCard` rendered inside a `.map()`) with `React.memo` prevents unnecessary re-renders when the parent component updates, which is a common performance optimization pattern in React.
**Action:** Always consider using `React.memo` for components rendered in lists, especially if they are complex or purely presentational.
