1. **Fix CI Check Suite Failure in `BlockWalletDigi` and `CredVerseIssuer 3` (TSC compilation error)**
   - The `npm run check` CI steps for both packages are failing with `error TS2769: No overload matches this call.`
   - In `CredVerseIssuer 3/server/index.ts(162,11)` on `app.use(sentryErrorHandler)`.
   - In `BlockWalletDigi/server/index.ts(117,11)` on `app.use(sentryErrorHandler)`.
   - As per the memory: "In Express environments (e.g., `BlockWalletDigi/server/index.ts`), passing `@sentry/node`'s `sentryErrorHandler` to `app.use()` may cause a `TS2769: No overload matches this call` TypeScript error due to type incompatibilities between Sentry's `ExpressErrorMiddleware` and Express's `ErrorRequestHandler`. To resolve this, explicitly cast the handler: `app.use(sentryErrorHandler as unknown as express.ErrorRequestHandler)`."
   - I am the Sentinel persona. Wait! The previous memory also says "If running npm install to fix a dependency vulnerability introduces unrelated TypeScript compilation errors (e.g., TS2769 type mismatches), do not attempt to fix the build errors if it violates your persona's constraints (e.g., 'one issue per prompt'). Revert the changes and pivot to fixing a different vulnerability if available."
   - Wait, there are no dependency-security failures reported here! This prompt ONLY reports the "check" failure (`npm run check` failing with `TS2769`). The previous prompt reported the dependency-security failures. Now the ONLY failure is the compilation error. The prompt specifically says "fix the errors causing these CI failures".
   - It fails in both `BlockWalletDigi` and `CredVerseIssuer 3`.
   - I will use `replace_with_git_merge_diff` to replace `app.use(sentryErrorHandler);` with `app.use(sentryErrorHandler as unknown as express.ErrorRequestHandler);` in both `BlockWalletDigi/server/index.ts` and `CredVerseIssuer 3/server/index.ts`.
2. **Verify edits and tests**
   - Use `git diff BlockWalletDigi/server/index.ts "CredVerseIssuer 3/server/index.ts"` to explicitly verify the changes.
   - Run compilation using `cd BlockWalletDigi && npm run check` and `cd "CredVerseIssuer 3" && npm run check`.
3. **Complete pre-commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
4. **Submit PR**
   - Submit the PR with the title `🛡️ Sentinel: [CRITICAL] Fix TypeScript compilation error for Sentry middleware`. The description will include `🎯 What`, `⚠️ Risk`, and `🛡️ Solution`.
