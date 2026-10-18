**[Documentation](README.md) / Part II · The implementation**

# 05 · Frontend implementation

> Explore the web interface, route structure, shared components and API integration.

<details>
<summary><strong>On this page</strong></summary>

- [5.1 Stack and responsibilities](#51-stack-and-responsibilities)
- [5.2 Routes](#52-routes)
- [5.3 Source map](#53-source-map)
- [5.4 Live data and development previews](#54-live-data-and-development-previews)
- [5.5 API integration](#55-api-integration)
- [5.6 Internationalization](#56-internationalization)
- [5.7 Design and migration rules](#57-design-and-migration-rules)
- [5.8 Developer commands](#58-developer-commands)

</details>

---

## 5.1 Stack and responsibilities

The frontend uses Next.js 15 App Router, React 19 and TypeScript. Its current UI foundations include Tailwind CSS v4, repository-owned React/HTML UI primitives, next-intl, next-themes and Sonner. MUI and other older dependencies remain while their consumers are migrated. TanStack is excluded from the target stack.

The browser manages presentation, form state, navigation and HTTP calls. The backend remains responsible for ownership, monetary validation, transfer pairing and authoritative balances.

## 5.2 Routes

Routes are organized under `src/app/[locale]`. Route-group folders such as `(app)` and `(auth)` do not appear in public URLs.

| English URL | Responsibility | Current implementation |
| --- | --- | --- |
| `/` | Application entry | Redirect to the dashboard |
| `/dashboard` | Period totals and breakdowns | Live `/api/v1/dashboard` requests |
| `/dashboard/wallet` | Wallet management | Live v1 wallet/color requests |
| `/dashboard/transaction` | Transaction management | Live v1 overview, filters, server pagination/charts/CSV; category metadata, single-movement creation, editing and confirmed deletion |
| `/dashboard/transaction/add_mobile` | Old mobile URL | Redirect to the standard transactions page |
| `/login`, `/register` | Sign-in and registration | Account pages outside the dashboard shell |
| `/verify-email`, `/resend-confirmation` | Confirmation workflow | Account email links and resend form |
| `/forgot-password`, `/reset-password` | Password recovery | Account recovery forms |
| `/dashboard/user/login`, `/dashboard/user/new` | Old account URLs | Redirects to the current account routes |
| `/dashboard/error` | Legacy error page | Legacy area awaiting consolidation |
| `/dashboard/not_implemented` | Unavailable features | Placeholder, including report navigation |
| `/design-system` | Developer catalog | Development-only previews with fixture data |

Italian uses the same URLs with `/it` prepended. These are frontend routes; do not confuse `/dashboard/wallet` with the API resource `/api/v1/wallets`.

## 5.3 Source map

| Location | Purpose |
| --- | --- |
| `src/app` | Pages, layouts, global styles and route groups |
| `src/components/app/app-shell.tsx` | Shared header, desktop/mobile navigation and session display |
| `src/components/ui` | Local UI primitives and visual variants |
| `src/components/shared` | Form controls, date fields, loading/error states and confirmation dialogs |
| `src/features/api/api-finance-pages.tsx` | Current live financial page components |
| `src/features/dashboard`, `wallets`, `transactions` | Feature models, adapters and visual components, including richer fixture previews |
| `src/lib/api/client.ts` | Shared Promise-based v1 account/resource client, DTO types, CSRF and typed errors |
| `src/i18n` | Routing, dictionaries, request configuration and locale-aware navigation |
| `src/lib/money.ts` | Shared money-input normalization |
| `src/lib/fixtures` | Synthetic development and test data |
| `src/providers` | Application-wide providers, including theme |
| `src/component`, `src/context`, `src/utilis` | Legacy components and utilities retained for existing consumers |

## 5.4 Live data and development previews

The dashboard route imports `ApiDashboardPage`; the transaction route imports `TransactionsDashboard`
with v1 filters and server-side pagination. KPI, comparison, daily miniatures and weekly/category
charts use the server overview; recent movements use a four-row request and CSV streams from the server.
The shared editor creates and edits single movements. The recurrence switch is disabled and
labelled "To be implemented"; no recurrence API or scheduler is provided.
The category dialog persists all metadata and reads back the canonical category. Icons/colors and
reserved types use server metadata. Edit loads transaction detail and PATCHes through the existing
API; confirmed deletion removes the movement or transfer pair and refreshes rows, balances and summaries.
Receipt and draft controls are removed.
The wallet route imports `WalletsDashboard`, with a shared `WalletEditorDialog` for creation/editing.
They perform real HTTP requests through `apiClient`; wallet creation, metadata updates and confirmed
deletion persist through v1 APIs. See the [wallet implementation notes](../../frontend/src/features/wallets/README.md).

The development catalog and feature tests use fixtures and view models. These are useful for inspecting layout, themes and loading/empty/error states without a running backend, but editing a preview does not persist a real financial record. Some richer feature components expose more controls than the simpler live pages. Always inspect the route import before assuming a component is the production implementation.

## 5.5 API integration

All account and financial calls use `apiClient` in `src/lib/api/client.ts`, with one Axios instance configured through `NEXT_PUBLIC_API_URL`, currently falling back to `http://localhost:5256`. Requests include credentials so the browser can send the Identity cookie. Before each mutation, the client obtains a fresh CSRF request token and includes `X-CSRF-TOKEN`. Tokens are not cached across mutations, so subsequent operations follow the current cookie identity after login, logout or account changes in another tab. Token-fetch failures stop the mutation and use the existing error flow.

The Promise client represents API failures as `ApiProblemError`, with HTTP status, stable code and optional field errors. Live pages currently map many failures to generic localized text. They support AbortSignal cancellation when loading data.

Account forms and session UI use the same Promise and `ApiProblemError` contract as financial resources. Callers own localized error presentation and finish loading state in `finally`. Cancellation is propagated to CSRF token requests as well as resource calls. Do not store authentication tokens in localStorage or readable cookies.

Authentication reads GET `/api/v1/auth/configuration` to follow the backend's `requireConfirmedEmail` policy. Login offers confirmation resend only when enabled, and the verification page explains when confirmation is unnecessary. Registration uses the same flag returned with 202 acceptance to show either confirmation instructions or immediate-login guidance. Configuration requests support cancellation and a localized retry state; login remains available if configuration cannot be loaded.

`NEXT_PUBLIC_API_URL` is public build configuration. It is visible to the browser and must never contain secrets. A hostname such as `backend` can work between containers but is normally not resolvable by a user's browser.

## 5.6 Internationalization

| Rule | Implementation |
| --- | --- |
| Languages | English `en` and Italian `it` |
| Default URL | English without `/en` |
| Italian URL | `/it/...` |
| Detection | Browser-language detection and locale cookies disabled |
| Source of truth | URL locale |
| Regional formatting | English maps to `en-GB`; Italian maps to `it-IT` |
| Currency | EUR; locale does not imply currency conversion |
| Dates | Day.js for parsing/calculation; next-intl/Intl for display |
| Navigation | Import the wrapper in `src/i18n/navigation.ts` |
| UI messages | Semantic dictionary keys; user-entered names remain unchanged |

The plan requires a locale selector preserving route/query and confirmation before discarding modified forms. The current live shell does not expose the complete selector, and live API forms do not implement this confirmation everywhere. This guide describes that gap rather than treating the design contract as implemented behavior.

## 5.7 Design and migration rules

Semantic tokens live in `src/app/globals.css`; use shared tokens and variants for backgrounds, text, brand red, borders and income/expense/transfer colors. The theme provider initially follows the operating system. The development catalog exposes an explicit theme switch.

Tailwind Preflight remains disabled while MUI areas coexist. Do not add MUI to migrated routes, create a separate mobile domain implementation or remove a legacy dependency until an entire frontend search shows no consumers. Use local UI primitives and shared components for new work.

The historical official visual reference is `docs/dashboard_mockup.png`, also referenced under `docs/all_modernization/`. That asset and the historical migration/design/internationalization records are absent from this checkout. Use existing shared tokens and components as the available reference; do not invent missing specifications. Mockup elements do not authorize new reports, budgets, goals, global search, notifications or other future features. The three-touch Quick Add remains an outstanding goal to implement when requested.

Follow the current [frontend instructions](../../frontend/AGENTS.md), including design and internationalization rules, and check current route imports for runtime behavior. Consult historical records if they become available.

## 5.8 Developer commands

For ordinary AI verification, use only:

```powershell
npm --prefix frontend run build
```

Once the full build exits with code 0, stop. Do not run tests, separate lint/typecheck/format checks, start a server or open a browser unless explicitly requested by the owner. Keep Next.js build checks enabled. For documentation-only changes, check links and `git diff --check` without a build.

Other scripts such as `dev`, `start`, `test`, `lint` and `format` remain available for manual work or explicit requests. Install dependencies from the lockfile only when needed. See [frontend AGENTS.md](../../frontend/AGENTS.md) and [chapter 10](10-development-and-troubleshooting.md) for the verification policy.


---

| Previous | Documentation | Next |
| :--- | :---: | ---: |
| [← Backend implementation](04-backend.md) | [Index](README.md) | [Settings reference →](06-settings-reference.md) |
