## 2024-09-27 - Accessible Icon Buttons without Providers
**Learning:** Adding Tooltip components around icon-only buttons sometimes fails if the parent context (TooltipProvider) is missing or hard to inject under strict file limits.
**Action:** Use native `title` and `aria-label` attributes on icon-only buttons as a lightweight, robust alternative to complex Tooltip components for accessibility and usability.
