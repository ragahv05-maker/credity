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

## 2024-10-25 - CredVerseRecruiter Header Accessibility
**Learning:** Found that the top navigation header had several `lucide-react` icon-only buttons missing accessible names. Adding `aria-label` attributes to these buttons ensures screen reader users can identify their purpose (Toggle Theme, Help, Notifications, User Menu). Additionally, running `npm run dev` in `CredVerseRecruiter` requires creating a `.env` file first if it doesn't exist, as the start script relies on `--env-file=.env`.
**Action:** Always check icon-only buttons (common in layout headers) for `aria-label` or visually hidden text, and ensure the `.env` file exists when attempting to start a local dev server for UI verification.
