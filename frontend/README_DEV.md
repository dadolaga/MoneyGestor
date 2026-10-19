# Frontend conventions

This file describes existing or intended frontend conventions. It does not replace ESLint or TypeScript.

## Planned UI migration

The migration to Tailwind CSS and local React/HTML primitives follows the
[frontend instructions](AGENTS.md) and the [implementation guide](../backend/docs/05-frontend.md).
TanStack is outside the target stack. MUI conventions apply only to legacy areas.
Historical planning, design and baseline documents are absent from this checkout: check the current
state through route imports and shared components. The shared movement editor now adapts to a
two-step full-screen form below 640px; its state, validation and API submission remain shared with
desktop (see the [transactions guide](src/features/transactions/README.md)).

Phases 1–6 are implemented: Tailwind v4 without Preflight, local React/HTML primitives, `next-intl`,
`next-themes`, Sonner and the `/design-system` development catalog. Legacy MUI routes live under
`app/[locale]/(legacy)` without changing public URLs; the shared shell does not import MUI and new
features belong to `(app)`. View models and pure adapters live in their respective features, while
shared fixtures live in `src/lib/fixtures`. Visual components receive data and state through props
using the discriminated `FeatureState<T>` type.

The `/dashboard`, `/dashboard/wallet` and `/dashboard/transaction` routes live in `(app)` and use
`/api/v1`; the wallet page now shows balances, selection, recent movements and distribution with
a shared creation/editing dialog for five wallet types. CRUD and metadata persist through v1 APIs;
other actions show a shared Coming soon dialog (see the [wallet README](src/features/wallets/README.md)).
Movements use filters and server-side pagination. Fixtures remain for previews and tests. Authentication,
session UI and financial resources share the Promise client in `src/lib/api/client.ts`.

The `AppShell` centralizes the header, desktop navigation, mobile Sheet, session state and language
selector. Flowiy login and registration live in `(flowiy-auth)` with their shared marketing layout.
Password recovery and confirmation resend use dialogs inside login; their former routes and the
former Flowiy URLs redirect from `(auth-redirects)`. Email verification and token-based password
reset remain in `(auth)`. The browser uses an Identity session through HttpOnly
cookies and antiforgery: do not read, save or send authentication tokens from JavaScript.
Previous dashboard login/registration URLs perform temporary redirects.

Vitest, Testing Library, `user-event` and `jest-dom` are configured without forcing peer dependencies.
Playwright is planned alongside smoke tests for the first migrated slice.

During the transition:

- A route declared migrated must not import MUI.
- New code uses semantic tokens and shared primitives rather than ad hoc visual values.
- Next.js App Router remains the application router.
- The frontend contains only presentation state and validation; substantial domain logic stays in the backend.
- Tables use local primitives and simple React state until future backend integration.
- Desktop and mobile share form fields, components and state.
- New forms use React Hook Form only for state, errors and submission; domain rules remain in the backend.
- User-entered amounts are normalized once at the presentation boundary using the active locale.
- Wallet and movement amounts accept either `.` or `,` as the decimal separator (for example,
  `12.50` and `12,50` both mean 12 euros and 50 cents). If both separators occur, the active locale
  determines decimal and grouping separators. A single separator is always treated as decimal.
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

## Shared UI primitives

Shared controls are owned by this repository. Selects use a button or editable input with the shared
native popover, one selected-row treatment (tinted background and checkmark), and optional option icons.
Enable `searchable` for name-based lists: filtering happens in the upper control, with no search field
inside the list. `InputField` forwards `options` and `searchable` to this same primitive. Arrow keys,
Home/End (Ctrl+Home/End while editing), Enter and Escape operate the list without moving input focus.
Checkboxes and progress indicators use native HTML elements; modal dialogs and mobile sheets use `dialog.showModal()` for focus containment,
background inertness and focus restoration. Confirmation dialogs initially focus Cancel and do not
dismiss on backdrop clicks. Calendar popups and action menus use the native Popover API in the
browser top layer, including inside dialogs. Menus support arrows, Home/End, typing and Escape.
Do not add Radix packages or overwrite these implementations with Radix-based generator templates.

Modal content uses an explicit auto height bounded by the viewport. Only `DialogBody` scrolls;
headers and footers remain outside that region and do not shrink. Forms between the dialog and
its body use `min-h-0` and `overflow-hidden`. Keep disabled fieldsets inside the scrolling body,
with footer actions disabled explicitly while a request is pending.

## Application notifications

Sonner is the only toast system. `AppProviders` mounts one shared `Toaster` from
`src/components/ui/sonner.tsx` in the locale layout, covering public, account and dashboard pages.
It follows the saved application theme, uses shared surface tokens, translated accessibility labels
and responsive offsets, and shows up to three notifications at once.

Use `notify` from `@/lib/notifications` with translated strings instead of importing Sonner directly:

```ts
notify.success(t('saved'));
notify.error(t('refreshFailed'));
notify.info(t('actions.deferred'));

const id = notify.loading(t('saving'), 'feature:save');
// In the request's success/error handlers, update the same notification:
notify.success(t('saved'), id);
// On failure, use notify.error(t('saveFailed'), id) instead.
```

Success and informational notifications last four seconds and errors six seconds. Loading notifications remain until
updated or dismissed with `notify.dismiss(id)`. Without an explicit ID, identical messages of the same
type update one notification; supply an operation ID to share a notification across loading and outcome.
Sonner owns the queue and timers; do not add parallel notification state.

The live transactions page uses this shared system for creation, editing and deletion
feedback, without a separate page notification banner.

Keep validation, form submission errors and page load/retry states in their existing context. Do not
show a second toast for an error already handled there, and do not notify on cancelled requests or
expected anonymous session checks. The shared Promise API client leaves error presentation to its
caller. Logout uses one loading/outcome notification and disables resubmission while pending.

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

All v1 account and resource calls go through `apiClient` in `src/lib/api/client.ts`; do not create
Axios instances directly in pages or hooks. The client returns Promises and normalizes HTTP and
network failures as `ApiProblemError`, preserving status, code and field errors. Use `try`/`catch`
with `finally` to finish loading state on success and failure. Pass an `AbortSignal` for cancellable
loads and avoid updating state or showing notifications after cancellation.

## Forms

- Global disabled and read-only styles live in `src/app/globals.css`: darker surfaces and muted text
  cover native controls, shared disabled states, composite `FieldControl` wrappers and legacy MUI inputs.
  Locked controls and labels wrapping disabled inputs do not receive pointer interactions.
  Native `fieldset` disabling is respected. Use semantic disabled/read-only attributes instead of
  adding feature-specific colour or opacity overrides. Custom radio/checkbox tiles should use a
  direct `input.sr-only` child of their label followed by the visible `span`.
  A disabled select option (including a placeholder) must not disable its `FieldControl` wrapper;
  wrapper disabled selectors must target the actual input, button, select or textarea.
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
