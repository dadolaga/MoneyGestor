# Frontend conventions

This file describes existing or intended frontend conventions. It does not replace ESLint or TypeScript.

## Planned UI migration

The migration to Tailwind CSS and shadcn/ui on Radix follows the
[frontend instructions](AGENTS.md) and the [implementation guide](../backend/docs/05-frontend.md).
TanStack is outside the target stack. MUI conventions apply only to legacy areas.
Historical planning, design and baseline documents are absent from this checkout: check the current
state through route imports and shared components. Mobile Quick Add remains deferred until
explicitly requested.

Phases 1–6 are implemented: Tailwind v4 without Preflight, local shadcn/Radix primitives, `next-intl`,
`next-themes`, Sonner and the `/design-system` development catalog. Legacy MUI routes live under
`app/[locale]/(legacy)` without changing public URLs; the shared shell does not import MUI and new
features belong to `(app)`. View models and pure adapters live in their respective features, while
shared fixtures live in `src/lib/fixtures`. Visual components receive data and state through props
using the discriminated `FeatureState<T>` type.

The `/dashboard`, `/dashboard/wallet` and `/dashboard/transaction` routes live in `(app)` and use
`/api/v1`; wallets support creation/editing, favorites and deletion, while movements use filters and
server-side pagination. Fixtures remain for previews and tests. The resource client is
`src/lib/api/client.ts`; `useApi` remains only as a callback adapter for legacy account forms.

The `AppShell` centralizes the header, desktop navigation, mobile Sheet, session state and language
selector. Login, registration, email confirmation, resend and password recovery live in `(auth)`,
so they do not receive the dashboard shell. The browser uses an Identity session through HttpOnly
cookies and antiforgery: do not read, save or send authentication tokens from JavaScript.
Previous dashboard login/registration URLs perform temporary redirects.

Vitest, Testing Library, `user-event` and `jest-dom` are configured without forcing peer dependencies.
Playwright is planned alongside smoke tests for the first migrated slice.

During the transition:

- A route declared migrated must not import MUI.
- New code uses semantic tokens and shared primitives rather than ad hoc visual values.
- Next.js App Router remains the application router.
- The frontend contains only presentation state and validation; substantial domain logic stays in the backend.
- Tables use shadcn and simple React state until future backend integration.
- Desktop and mobile share form fields, components and state.
- New forms use React Hook Form only for state, errors and submission; domain rules remain in the backend.
- User-entered amounts are normalized once at the presentation boundary using the active locale.
- `DateRangeField` exchanges `Date` values with the calendar and converts to Day.js at its boundary.
- Day.js is the only date library.
- Light and dark themes use the same tokens, including configurable brand red.
- Login and registration remain outside the dashboard shell.
- The component catalog is a lightweight internal route, not Storybook.
- `docs/dashboard_mockup.png` is the official visual baseline.
- Use “movimento” in Italian UI text; retain `Transaction` in existing technical names.
- Do not implement future features shown in the mockup unless explicitly requested.
- Tailwind Preflight remains disabled while MUI coexists; enable and verify it only after the final legacy route.
- The application theme initially follows the system and preserves an explicit user choice.

## Internationalization

The public homepage slice is implemented in `src/features/home`, with the `Home` namespace in English
and Italian dictionaries. Shared marketing styles and tokens are in `src/styles/marketing.css`;
the landing page starts dark like the reference and its theme selector is local, without changing
the saved dashboard theme. Previews are static and make no API calls.
See the [homepage and image specifications](docs/HOMEPAGE.md).

Follow the [internationalization rules](AGENTS.md#languages-dates-and-conventions).

- Do not hard-code meaningful user-facing text in migrated slices.
- Use semantic keys and namespaces for each feature.
- Use shared formatters for currency, percentages and dates.
- Day.js handles parsing and calculations; next-intl/Intl handles localized presentation.
- Use the locale-aware navigation wrapper instead of importing Next.js APIs directly in features.
- English is the deterministic fallback; do not use `Accept-Language` to change the first visit automatically.
- Do not translate user-entered names or descriptions.
- Do not add keys for future features outside the scope.

## Component ordering

Inside a React component, use this order:

1. Context and routing hooks.
2. State and refs.
3. `useEffect`.
4. API loading functions named `load...` or `reload...`.
5. Helper functions.
6. Event handlers with the `Handler` suffix.
7. Local rendering functions.
8. JSX `return`.

When a `useEffect` uses a loading function declared later, the function must be stable
(`useCallback`) or the effect must contain the operation directly. Avoid disabling
`react-hooks/exhaustive-deps` without documenting the actual reason.

## Naming

- Components and component files: `PascalCase`.
- Hooks: `use` prefix.
- Remote loading: `loadWallets`, `reloadTransactions`, `loadUserInformation`.
- Events: `saveHandler`, `closeDialogHandler`, `changePageHandler`.
- Booleans: `is`, `has`, `show` or `open` prefixes.
- Imported types: use `import type` to respect `consistent-type-imports`.

## API calls

V1 resources go through `src/lib/api/client.ts`; do not create Axios instances directly in pages.
Every call that increments loading state must also decrement it on errors using `onFinish`.

The `ApiRequest` wrapper currently does not return a Promise from `execute`. Until it is refactored,
handle success, error and completion through available callbacks and do not use `await execute()`.

## Forms

- Define rules in a `FormSettings` object near the component, or export them only when genuinely shared.
- Do not rely on TypeScript casts to convert runtime values: text inputs remain strings and must be
  converted explicitly before the request.
- Display backend errors on the correct field when a mapping exists; use a snackbar for general errors.

## Verifying AI changes

For frontend changes, run only the following from the repository root:

```powershell
npm --prefix frontend run build
```

Wait for the full build to finish: if the exit code is 0, stop and hand off the result. Fix introduced
errors and rebuild only when necessary. Do not run tests or separate lint, typecheck or format checks,
start servers or open browser pages unless the owner explicitly requests it.
Keep internal Next.js checks enabled. Report environmental and pre-existing blockers separately.
For documentation-only changes, links, consistency and `git diff --check` are sufficient; no build.
See [AGENTS.md](AGENTS.md) and the [Codex workflow](../docs/AI_WORKFLOW.md).
