## 2024-10-25 - Icon Button Tooltips
**Learning:** Icon-only buttons lacking `aria-label` or tooltips hinder accessibility and UX, especially for screen readers or users on desktop wanting clarification.
**Action:** Always wrap icon-only buttons with `Tooltip` components (`<TooltipTrigger asChild>`, `<TooltipContent>`) and provide `aria-label`s. Ensure `TooltipProvider` is at the app root to avoid React context errors. Wait for hover animations when visually verifying tooltips with Playwright.
