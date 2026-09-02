# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-02-24 - Hoisted Modal Performance
**Learning:** Hoisting modals outside of loops significantly reduces DOM nodes and improves rendering performance for lists, especially with complex modal content (like Dialog).
**Action:** Always check if modals or complex conditional content can be rendered once and controlled by state instead of per-item.
## 2024-05-24 - Unpaginated API Responses Require Client-Side Memoization
**Learning:** The application fetches entire collections (like records or students) without pagination. Unmemoized array operations (`.filter`, `.map`) on these large datasets combined with redundant per-item calculations (like `.toLowerCase()`) directly block the main React thread during every re-render.
**Action:** When filtering unpaginated API data, always wrap the computation in `useMemo` and hoist static calculations outside the `.filter` loop to maintain rendering responsiveness.
