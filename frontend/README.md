# MoneyGestor frontend

MoneyGestor web client built with Next.js 15, React 19 and TypeScript. Legacy routes still use Material UI;
foundations and new components use Tailwind CSS, shadcn/ui on Radix and next-intl.

The frontend is progressively migrating to Tailwind CSS and shadcn/ui with Radix primitives. Phases 1–6
are implemented: foundations, shell, authentication and wallets already use the new stack. TanStack
is excluded; MUI remains only in legacy slices that have not been migrated. Light/dark themes,
configurable brand red and shared components follow the
[frontend instructions](AGENTS.md#implementing-ui-and-state). The dashboard mockup and historical
migration records are absent from this checkout; use existing tokens and components as the reference.
Three-touch mobile Quick Add remains a goal to implement when requested.

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

Open `http://localhost:3000`. If `NEXT_PUBLIC_API_URL` is unset, the client currently uses
`http://localhost:5256`; always setting this variable makes development more reproducible.

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
| `/dashboard` | Income, expense and category overview from `/api/v1` |
| `/dashboard/wallet` | Wallet management through `/api/v1`, including favorites and balances |
| `/dashboard/transaction` | Movement CRUD with typed filters and server-side pagination |
| `/dashboard/transaction/add_mobile` | Mobile prototype to incorporate into the future shared Quick Add |
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
Password recovery and confirmation-email resend open Radix dialogs within login without navigating
or clearing the login form. Each dialog validates the email and displays loading, generic acceptance
or request errors using the existing account API. Old direct URLs redirect to `/login?recovery=forgot`
or `/login?recovery=resend`, opening the same dialogs. Token-based password reset and email
verification remain dedicated pages.
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

- `src/app`: routes and page-specific components.
- `src/components/shared`: shared components for the new system, including forms, states and confirmations.
- `src/component` and `src/context`: legacy MUI components, retained while they have consumers.
- `src/hooks/useApi.ts`: callback adapter for `/api/v1` account endpoints used by legacy forms.
- `src/lib/api/client.ts`: Promise-based client with cookies, antiforgery, typed errors and cancellation for v1 resources.
- `src/features`: view models, pure adapters and visual components driven through props.
- `src/lib/fixtures`: realistic development and test data without a backend.
- `src/types/feature-state.ts`: shared `idle`, `loading`, `ready`, `empty` and `error` states.
- `src/models/backend.ts`: API contract types.
- `src/utilis`: conversions for filters, colors and monetary values.

Migrated pages do not read authentication tokens; they use the HttpOnly Identity cookie and send the
antiforgery header before mutations. The legacy server-side client remains isolated until the compatibility
window ends.

For internal conventions, see [README_DEV.md](README_DEV.md). For development issues, see
[troubleshooting](../backend/docs/10-development-and-troubleshooting.md).
