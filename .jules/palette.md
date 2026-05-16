## 2024-05-16 - Radix UI Tooltip Accessibility Pattern
**Learning:** Found that `shadcn/ui` Tooltip implementation requires wrapping icon-only buttons with `TooltipTrigger asChild` and providing descriptive `TooltipContent` to function correctly and remain accessible, avoiding invalid nested `<button>` tags.
**Action:** When adding tooltips to existing components like `<Button>`, always use `asChild` on the `TooltipTrigger` to prevent rendering a button within a button.
