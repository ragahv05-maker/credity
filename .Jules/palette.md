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

## 2024-11-20 - Icon-Only Buttons Accessibility in CredVerseIssuer 3
**Learning:** For icon-only buttons using shadcn/ui Tooltips, the tooltip visual text alone does not suffice for screen readers. It's crucial to also add a `<span className="sr-only">` label inside the `<Button>` and set `aria-hidden="true"` on the icon itself (`<Copy className="h-4 w-4" aria-hidden="true" />`).
**Action:** When adding tooltips to icon-only buttons, always include `sr-only` text and hide the icon from screen readers to ensure full accessibility compliance.

## 2024-11-20 - Dependency Security (Axios & WS)
**Learning:** High-severity vulnerabilities in nested dependencies (`axios` prototype pollution, `ws` memory exhaustion, `esbuild` arbitrary file read, `uuid` buffer bounds check) caused the `dependency-security` CI check to fail in `CredVerseIssuer 3`. The `npm audit fix` command successfully patched these by automatically resolving and updating the `package-lock.json` file.
**Action:** When `dependency-security` CI fails due to organic pre-existing vulnerability discovery, use `npm audit fix` in the relevant directory (`CredVerseIssuer 3` in this case) to safely resolve the lockfile vulnerabilities without breaking downstream builds.
