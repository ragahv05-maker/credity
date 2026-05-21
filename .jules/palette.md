
## 2024-10-25 - Tooltip Accessibility in Header Component
**Learning:** Adding Tooltips to header actions provides essential context, but requires ensuring multiple nested button structures do not exist when wrapping icon buttons. Using `TooltipTrigger asChild` over an existing `<Button>` properly forwards refs without creating invalid nested button HTML.
**Action:** When improving navigation accessibility with tooltips, always use `asChild` on triggers wrapping existing button components, and add an explicit `aria-label` to the button for screen readers.
