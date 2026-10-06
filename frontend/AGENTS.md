# AI instructions for the frontend

These instructions apply to `frontend/` and supplement the [shared AGENTS.md](../AGENTS.md).
They apply to Codex and other assistants changing the interface, routing, styles and translations.

## Main rule: build and stop

For a frontend change, the only required default verification is:

```powershell
npm --prefix frontend run build
```

Run this command from the repository root, wait for the entire build to finish and check its exit code.
From `frontend/`, the equivalent command is `npm run build`.
If the full build exits with code 0, verification is complete: **stop and hand off the result**.
A successful compilation message alone is insufficient if a later build phase fails.

- Do not run unit tests, component tests, Vitest, Playwright, E2E, smoke tests or full suites.
- Do not run separate `typecheck`, `lint` or `format:check` commands as mandatory steps.
- Do not start `npm run dev`, `npm run start`, servers or containers to inspect the UI.
- Do not open web pages, use browser automation, take screenshots or compare runtime visuals.
- Do not add or change tests merely to complete an ordinary frontend request.
- Do not disable checks built into `next build` or hide TypeScript/ESLint errors.
- The presence of scripts, fixtures, tests or a `/design-system` route does not require running them.

Additional verification is allowed when the owner explicitly requests it.
If the change introduces errors, fix them and rerun the build. After a successful build, do not
repeat checks without new changes or unresolved problems.
If dependencies are missing, install them from the lockfile when necessary without incidental upgrades.
If an error comes from the environment, network or pre-existing code, report the blocker without
launching the page or claiming successful compilation. Do not disable checks to work around it.

For documentation-only changes, do not build: check links, consistency and `git diff --check`.
This policy replaces previous extended verification checklists for ordinary AI work.

## Reading and structure

Read the [README](README.md), [conventions](README_DEV.md) and
[frontend guide](../backend/docs/05-frontend.md); for integrations, read the
[API contract](../backend/docs/07-api-reference.md).

- `src/app/[locale]`: Next.js App Router routes and layouts; keep pages thin.
- `src/features`: components, view models and adapters for the affected feature.
- `src/components/ui`: local shadcn/ui and Radix primitives with shared variants.
- `src/components/shared`: form fields, states, dialogs and common components.
- `src/components/app/app-shell.tsx`: dashboard shell shared by desktop and mobile.
- `src/lib/api/client.ts`: Promise-based client for `/api/v1` resources.
- `src/hooks/useApi.ts`: account callback adapter; respect its actual contract.
- `src/i18n` and `messages/en`, `messages/it`: navigation and local dictionaries.
- `src/component` and `src/context`: legacy areas to retain while they have consumers.

Follow the actual route imports: a fixture preview does not prove that the live page uses that
component. Change the real flow involved in the request.

## Implementing UI and state

The current stack is Next.js 15, React 19, TypeScript, Tailwind v4, shadcn/ui on Radix and next-intl.
MUI remains temporarily in legacy areas. Do not add it to migrated slices or introduce TanStack.
Routing remains the responsibility of Next.js App Router; use the locale-aware navigation wrapper
in multilingual features.

Reuse semantic tokens in `src/app/globals.css`, primitives and shared variants. Preserve light/dark
themes and configurable brand red; do not create a separate palette or visual language per page.
For the homepage, also use `src/styles/marketing.css` and homepage specifications when available.
Tailwind Preflight stays disabled while MUI coexists.

Migrate complete vertical slices. Desktop and mobile share logic, fields and state; adapt the layout
without duplicating the feature. Login and registration stay outside the dashboard shell.
Preserve semantics, focus and the basic behavior supplied by Radix primitives.

The historical dashboard reference is `docs/dashboard_mockup.png` (or its copy under
`docs/all_modernization/`, when present). It is unavailable in this checkout: use existing tokens
and components without inventing the reference's contents. Three-touch Quick Add remains a priority
when requested, with the full form available; do not implement it incidentally.
Do not add global search, notifications, categories, budgets, goals, reports, export, movement status
or historical trends merely because they appear in a mockup.

## Forms and APIs

Handle presentation, state and field validation in the frontend; ownership, monetary precision,
transfers and authoritative balances remain in the backend. Do not change APIs or domain rules
to resolve a UI request. Use existing clients instead of scattering Axios instances across pages.

The browser uses HttpOnly Identity cookies and antiforgery. Do not read or store authentication
tokens in JavaScript. Preserve field errors, loading/empty/error states and cancellation where present.
Callback calls must finish loading state even on errors through `onFinish`; do not treat `execute()`
as a Promise if it does not return one.

Use React Hook Form for state, errors and submission in new forms. Convert runtime values explicitly:
a TypeScript cast does not convert a string. Normalize amounts once at the presentation boundary
using the active locale and shared helpers.

## Languages, dates and conventions

- Default to English without a URL prefix; Italian uses `/it`; no browser-language detection.
- Put meaningful text in both language dictionaries with semantic keys for each feature.
- Use “movimento” in Italian UI text; retain `Transaction` in technical names.
- Use shared formatters and next-intl/Intl to display currency, percentages and dates.
- Day.js is the only library for date parsing and calculations; do not introduce others.
- Import navigation from `src/i18n/navigation.ts`, preserving routes and queries on locale changes.
- In the product, ask for confirmation before changing language when a form has unsaved changes.
- Do not translate user-entered names and descriptions.
- Follow naming, hook ordering and import type conventions in README_DEV.md; avoid `any` and casts
  used solely to hide incompatibilities.

Do not remove a legacy dependency until a search across the entire frontend confirms it has no
consumers. Update available guides when a slice changes status, distinguishing live features,
previews and future work.
