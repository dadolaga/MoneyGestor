# MoneyGestor frontend

MoneyGestor web client built with Next.js 15, React 19 and TypeScript. Legacy routes still use Material UI;
foundations and new components use Tailwind CSS, local React/HTML primitives and next-intl.

The frontend is progressively migrating to Tailwind CSS with local React/HTML primitives. Phases 1–6
are implemented: foundations, shell, authentication and wallets already use the new stack. TanStack
is excluded; MUI remains only in legacy slices that have not been migrated. Light/dark themes,
configurable brand red and shared components follow the
[frontend instructions](AGENTS.md#implementing-ui-and-state). The dashboard mockup and historical
migration records are absent from this checkout; use existing tokens and components as the reference.
The shared movement dialog provides a two-step mobile layout with wallet, category and date top
sheets; desktop keeps its complete single-step form. See the [transactions guide](src/features/transactions/README.md).

Use “movimento” in Italian UI text; `Transaction` remains the internal technical name. Future features
shown in the mockup are outside the current scope.

The multilingual architecture uses next-intl, English by default, optional Italian, local dictionaries
and centralized formatting. See the [internationalization rules](AGENTS.md#languages-dates-and-conventions).

## Working with Codex and other assistants

Read [AGENTS.md](AGENTS.md) and the [AI workflow](../docs/AI_WORKFLOW.md). For a frontend change,
default verification consists only of `npm --prefix frontend run build`: after it completes with
exit code 0, stop. Do not run tests or separate checks, or start the application or a browser,
unless explicitly requested. Documentation-only changes do not require a build.

The startup instructions and scripts below are available for manual use and do not add steps
to ordinary AI verification.

## Manual startup

From the repository root:

```powershell
$env:NEXT_PUBLIC_API_URL = 'http://localhost:5256'
npm --prefix .\frontend install
npm --prefix .\frontend run dev
```

Alternatively, from the `frontend` directory:

```powershell
$env:NEXT_PUBLIC_API_URL = 'http://localhost:5256'
npm install
npm run dev
```

Open `http://localhost:3000`. Set `NEXT_PUBLIC_API_URL` explicitly for reproducible development.
Account and resource calls use the shared Promise client in `src/lib/api/client.ts`; the public environment
variable takes precedence over its development fallback. Logging in through `localhost` does not
authenticate requests sent to a LAN IP. For phone access, open the frontend through the PC's LAN IP
and use the same scheme and IP for the API (with its backend port). Allow that frontend origin in
the backend CORS configuration. Rebuild/restart the frontend after changing the public variable,
then sign in again through the matching address.
The backend `http` launch profile listens on all IPv4 interfaces and explicitly allows
`http://localhost:3000` and `http://192.168.178.56:3000` through indexed environment overrides.
These LAN development addresses must be updated together if the PC's IP or frontend port changes;
restart the backend with that profile for the overrides to take effect.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start the production build |
| `npm run lint` | ESLint checks |
| `npm run lint:fix` | Automatic ESLint fixes |
| `npm run test` | Unit and component tests with Vitest/Testing Library |
| `npm run typecheck` | TypeScript checks without emitting files |
| `npm run format` | Prettier formatting |
| `npm run format:check` | Prettier checks |

## Main routes

The public Flowiy homepage is available at `/` (English) and `/it` (Italian), outside the dashboard shell.
It follows the `Flowiy_ Finanze Semplici e Condivise.png` reference, with a responsive layout, local light/dark
themes, FAQs and locale-aware authentication links. Cards are illustrative examples; the two large previews
reserve space for images. Asset specifications, tokens and UI choices: [Flowiy homepage](docs/HOMEPAGE.md).

| Route | Purpose |
| --- | --- |
| `/`, `/it` | Public Flowiy homepage in English and Italian |
| `/dashboard` | Wealth, monthly income/expenses/savings, daily trend, wallet distribution, recent movements and shared creation dialogs from `/api/v1`; see the [dashboard README](src/features/dashboard/README.md) |
| `/dashboard/wallet` | Wallet overview and persistent v1 CRUD with a shared editor for five wallet types; other action dialogs deferred |
| `/dashboard/transaction` | Movement dashboard with server summaries/charts/CSV, filters, pagination, complete categories, single-movement creation, editing and confirmed deletion |
| `/dashboard/transaction/add_mobile` | Compatibility redirect to the transactions page; mobile creation uses the shared editor |
| `/login`, `/register` | Flowiy authentication pages with shared marketing layout and existing account API |
| `/login-flowiy`, `/register-flowiy` | Compatibility redirects to `/login` and `/register` |
| `/forgot-password`, `/resend-confirmation` | Compatibility redirects opening the corresponding popup on `/login` |
| `/dashboard/user/login`, `/dashboard/user/new` | Temporary redirects to authentication routes |
| `/dashboard/error` | Legacy error page to align with the design system |
| `/dashboard/not_implemented` | Placeholder for future features |

Login and registration are outside the dashboard shell; old routes remain temporary redirects.
Flowiy is the only login and registration interface, served at `/login` and `/register`.
The previous separate forms have been removed. Homepage, dashboard and account-recovery links
all lead to these canonical routes; the former Flowiy URLs remain compatibility redirects.
The Flowiy pages reuse the original `LoginPanel`, `RegisterPanel` and `AppHeader`, keeping form fields,
validation and the cookie/antiforgery account flows.
The Flowiy forms retain their field order and name/surname row, with leading icons, localized
placeholders and individual password visibility buttons. Registration validates the existing account
password requirements and matching confirmation. Login reports invalid credentials, temporary
lockout and rate limits; both forms display connection failures and finish their loading state.
Password recovery and confirmation-email resend open native modal dialogs within login without navigating
or clearing the login form. Each dialog validates the email and displays loading, generic acceptance
or request errors using the existing account API. Old direct URLs redirect to `/login?recovery=forgot`
or `/login?recovery=resend`, opening the same dialogs. Token-based password reset and email
verification remain dedicated pages.
Recovery triggers and their native dialogs use a block container, avoiding invalid paragraph/dialog
nesting and the resulting server/client hydration mismatch.
The backend controls email verification through `security.requireConfirmedEmail` (enabled by default).
Login and verification read `/api/v1/auth/configuration`; resend is hidden when verification is disabled.
Registration acceptance includes the same flag so the success message reflects the active policy.
With verification disabled, users can log in immediately; no frontend configuration switch is needed.
Both routes share a persistent Next.js layout: the Flowiy logo, finance headline and three benefit
columns sit above the tilted dashboard preview from `Finanze semplici con Flowiy.png`, framed by
red luminous waves. The source image is served as `public/flowiy-auth-reference.png` and the preview
region is selected in CSS; it remains illustrative and does not add dashboard features.
This introduction sits beside one card with identical dimensions and
position for login and registration. The card's login/register links change the route and form
inside that frame, while the introduction, header and card remain mounted.
The footer is omitted and the layout fits the viewport. The header contains an English/Italian
language dropdown and the theme control beside the account actions; the home link remains below it.
Language changes preserve the route and query parameters and still trigger confirmation for modified forms.
On narrow screens the introduction is hidden to prioritize the form.
If the form exceeds the available height (for example with field errors or the mobile keyboard),
only its panel scrolls so every field and action remains accessible.
English, Italian and the saved light/dark theme are supported. Google sign-in is not offered by
the current account API. `AppHeader` serves the homepage, dashboard shell and authentication pages with one shared frame.
Its navigation slots and account mode configure the page actions; language and theme controls
are always available before the account buttons. The homepage retains its navigation and local theme; dashboard and account
pages use the saved application theme. Header height, logo dimensions and position, and the red
background stay consistent at each viewport width. The stable brand token is `--app-header-brand`.
Shared marketing FAQ and icon components serve the homepage. Styles in `src/styles/marketing-auth.css` reuse marketing tokens.
Italian adds the `/it` prefix to the same routes. Account, wallet, movement and dashboard pages use
`/api/v1` with Identity cookies and antiforgery; fixtures remain available for previews and component tests.

## Organization

The wallet page follows the supplied Portafogli reference, while keeping the shared header and sidebar.
It reads existing v1 resources. The shared creation/editing dialog follows the account/card/cash field matrix;
creation, edits and deletion persist through the v1 APIs, including account/card metadata.
Cards support selection and deselection; the unselected view shows the table with edit/delete icons,
while the selected view shows wallet details. Pending states, server validation, deployment migration
and the Coming soon dialog for deferred actions are documented in the
[wallet README](src/features/wallets/README.md).

- `src/app`: routes and page-specific components.
- `src/components/shared`: shared components for the new system, including forms, states and confirmations.
- `src/component` and `src/context`: legacy MUI components, retained while they have consumers.
- `src/lib/api/client.ts`: shared Promise-based client with cookies, antiforgery, typed errors and cancellation for all v1 account and resource endpoints.
- `src/features`: view models, pure adapters and visual components driven through props.
- `src/lib/fixtures`: realistic development and test data without a backend.
- `src/types/feature-state.ts`: shared `idle`, `loading`, `ready`, `empty` and `error` states.
- `src/models/backend.ts`: legacy types retained for fixtures and adapters; active API contracts live in `src/lib/api/client.ts`.
- `src/utilis`: conversions for filters, colors and monetary values.

Migrated pages do not read authentication tokens; they use the HttpOnly Identity cookie and send the
antiforgery header before mutations. Authentication, session UI and financial features all use the same
client and `ApiProblemError` error contract.

For internal conventions, see [README_DEV.md](README_DEV.md). For development issues, see
[troubleshooting](../backend/docs/10-development-and-troubleshooting.md).

The movement dashboard follows the supplied Movimenti reference and reuses the shared shell, date range,
controls, table and chart library. It reads v1 transactions, wallets and categories; category/weekly charts,
period comparisons, recent rows and CSV export include all filtered pages. Transfers are shown once from
the source wallet and excluded from income/expense totals. The creation dialog saves single movements through the existing API. Income and expense share fields;
transfers add a distinct destination wallet. The recurrence switch is disabled and labelled
"To be implemented". Receipts and drafts are excluded. Editing and confirmed deletion use the
existing v1 APIs. The fixture preview is used by the development catalog.
The live dashboard is split into dedicated cards and form sections; see the
[transactions source map](src/features/transactions/README.md).
The movement creation form opens New category from the plus button beside its category selector.
The category dialog uses the same surface, header, spacing and footer as the movement dialog,
with no movement-kind selector, automatic-suggestion switch, rules panel or draft action.
Creation saves the category name through the existing v1 transaction-types API, updates the category
options and selects the new category without clearing the movement form. Parent category, icon,
color, description, keywords and report visibility are explicitly labelled as previews: the current
API does not store or apply these settings. English/Italian and light/dark themes are supported.
