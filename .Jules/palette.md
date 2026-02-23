## 2024-10-23 - CredVerseRecruiter Bulk Verify UX
**Learning:** Verified frontend changes in a complex auth-walled app by mocking API responses in Playwright, avoiding full backend setup.
**Action:** Use `page.route` to mock API endpoints for UI testing when backend is complex.

## 2024-10-23 - CredVerseRecruiter Sidebar Asset
**Learning:** Found and fixed a build-breaking missing image asset (`minimalist_abstract_logo_for_credverse.png`) by replacing it with a lucide-react icon (`ShieldCheck`).
**Action:** Always check for build errors in `npm run dev` logs even if static analysis passes.

## 2025-10-23 - CredVerseRecruiter Instant Verify Input Actions
**Learning:** Adding explicit "Paste" and "Clear" buttons to large text inputs (like JWTs) significantly improves usability over standard browser context menus, especially when users are repeatedly testing tokens.
**Action:** Consider wrapping long-text inputs in a standard "InputWithActions" component for future forms.
