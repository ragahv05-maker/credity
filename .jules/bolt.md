# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2025-02-28 - Unpaginated Data Filtering Main Thread Blocking
**Learning:** This codebase fetches entire collections (like credentials and templates) without pagination and performs filtering client-side during render. This can block the main thread when data sets get large, causing UI lag when typing in search fields or changing categories.
**Action:** Always wrap client-side `.filter()` and `.map()` operations on large arrays in `useMemo`, and hoist redundant per-item calculations (like `.toLowerCase()`) outside the loop to prevent unnecessary recalculations on every render.
