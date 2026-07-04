## 2024-10-23 - CredVerseRecruiter Bulk Verify UX
**Learning:** Verified frontend changes in a complex auth-walled app by mocking API responses in Playwright, avoiding full backend setup.
**Action:** Use `page.route` to mock API endpoints for UI testing when backend is complex.

## 2024-10-23 - CredVerseRecruiter Sidebar Asset
**Learning:** Found and fixed a build-breaking missing image asset (`minimalist_abstract_logo_for_credverse.png`) by replacing it with a lucide-react icon (`ShieldCheck`).
**Action:** Always check for build errors in `npm run dev` logs even if static analysis passes.

## 2024-10-23 - CredVerseRecruiter InputGroup Component
**Learning:** Found an existing but unused `InputGroup` component in `@/components/ui/input-group` that supports button addons for inputs and textareas, avoiding custom CSS.
**Action:** Always search for existing UI components (`grep -r "Component"`) before implementing custom styles.

## 2024-10-25 - Tooltip Accessibility in BlockWalletDigi
**Learning:** Found that `shadcn/ui` Tooltip implementation requires both `TooltipTrigger` and `TooltipContent` to function correctly and remain accessible.
**Action:** When adding tooltips to icon-only buttons, always wrap them in `TooltipTrigger` and provide descriptive `TooltipContent` for screen readers and hover states.

## 2024-10-25 - Dependency Security (Minimatch)
**Learning:** High-severity ReDoS vulnerabilities in `minimatch` (<9.0.6 or <10.2.2) blocked CI. `npm audit fix` successfully patched these by updating nested dependencies in `package-lock.json`.
**Action:** Regularly run `npm audit` in each package directory and prioritize fixing High/Critical vulnerabilities to prevent CI blockage.

## 2024-07-04 - Template Builder Canvas Fields Keyboard Accessibility
**Learning:** In the `CredVerseIssuer 3` template builder, drag-and-drop canvas fields (`dnd-kit` implementations) often hide their action buttons (like delete) until the field is selected. This makes standard keyboard navigation difficult because the action buttons are un-tabbable until clicked. Furthermore, icon-only buttons (`Trash2`) frequently miss `aria-label`s, rendering them completely invisible to screen readers once exposed.
**Action:** When working with interactive canvas or drag-and-drop elements, always ensure nested action buttons have explicit `aria-label`s (e.g., ``aria-label={`Delete ${field.label} field`}``), `title` tooltips for visual users, and distinct `focus-visible` styles (`focus-visible:ring-2`) to clearly indicate keyboard focus.
