<div align="center">

# MoneyGestor

**Your wallets, movements and everyday finances. In one place.**

A self-hosted personal finance website built with Next.js, ASP.NET Core and MySQL.

[Get started](docs/development/README.md) · [Production setup](docs/production/README.md) · [How to use](#how-to-use-moneygestor) · [API contract](docs/openapi/v1.json)

![Next.js 15](https://img.shields.io/badge/Next.js-15-18181b?style=flat-square&logo=nextdotjs)
![React 19](https://img.shields.io/badge/React-19-18181b?style=flat-square&logo=react)
![.NET 10](https://img.shields.io/badge/.NET-10-512bd4?style=flat-square&logo=dotnet)
![MySQL](https://img.shields.io/badge/MySQL-database-4479a1?style=flat-square&logo=mysql&logoColor=white)

</div>

---

MoneyGestor helps you record income and expenses, move money between wallets and understand where your money goes. It runs on your own infrastructure, with a responsive interface, English and Italian translations, and light and dark themes.

## What you can do

| Feature | What is available today |
| --- | --- |
| **Dashboard** | Current wealth, monthly income, expenses and savings, daily charts, wallet distribution and recent movements. |
| **Wallets** | Create and manage current accounts, prepaid cards, cash wallets and linked debit/credit card metadata. |
| **Movements** | Create, edit and delete income, expenses and transfers using a shared desktop/mobile editor. |
| **Categories** | Choose categories for movements and create custom categories from the editor. |
| **Explore your data** | Filter movements by date, wallet, kind, category and search; use pagination, summaries and charts. |
| **CSV export** | Download all movements matching the selected filters, including results beyond the current page. |
| **Accounts** | Registration, cookie-based login, optional email confirmation, password recovery and logout. |
| **Languages and appearance** | English at `/`, Italian at `/it`, localized amounts and dates, and light/dark themes. |

> [!NOTE]
> Some homepage examples and navigation entries describe future features. Budgets, goals, dedicated reports, bank synchronization, sharing permissions, recurring movements and automated credit-card billing are not implemented. `/design-system` contains development previews with fixture data.

## Get started

Choose the setup that fits your goal:

| | Development | Production |
| --- | --- | --- |
| **Use it for** | Working on the application locally with hot reload. | Hosting the compiled application for real use. |
| **Run with** | Node.js 22, .NET SDK and MySQL (included in Compose). | Docker Compose with the bundled MySQL service and an HTTPS reverse proxy. |
| **Entry point** | `http://localhost:3000` | Your HTTPS domain. |
| **Follow** | [Development README](docs/development/README.md) | [Production README](docs/production/README.md) |

The local workflow, after configuring and initializing the database, is:

```powershell
# Terminal 1 — repository root
$env:BACKEND_APP_SETTINGS = Join-Path (Get-Location).Path 'settings.json'
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project backend/webserver --no-launch-profile --urls http://localhost:5256
```

```powershell
# Terminal 2 — repository root
$env:NEXT_PUBLIC_API_URL = ''
npm --prefix frontend ci
npm --prefix frontend run dev
```

**First installation?** Complete the [configuration and database steps](docs/development/README.md#first-time-setup) before running these commands. Starting the API never creates or upgrades the database.

## How to use MoneyGestor

### 1. Create your account

Open `/register`, enter your name, username, email and password, then sign in at `/login`. Passwords require at least 12 characters, with uppercase and lowercase letters, a number and a symbol.

Opening the homepage with a valid session automatically redirects you to the dashboard in the current language. Visitors without a valid session stay on the homepage.

If the installation requires email confirmation, follow the link sent to your inbox before signing in. The login screen also provides account recovery and confirmation-email actions. Recovery requires working SMTP delivery.

### 2. Add your wallets

Open **Wallets** at `/dashboard/wallet` and add a wallet. Choose its type, name, colour and opening balance where applicable. The current currency is EUR.

| Wallet type | How to use it |
| --- | --- |
| Current account | An account with its own balance; can be linked to debit and credit cards. |
| Prepaid card | A card with its own balance. |
| Cash | A wallet with its own balance, without an institution field. |
| Debit card | Metadata linked to a current account; displayed movements come from that account. |
| Credit card | Metadata linked to a current account, including limit, spending and billing-day fields. Billing is not automated. |

Debit and credit cards do not have an independent movement balance and do not add to the wealth total. Record movements and transfers against balance-owning wallets.

Select a wallet to inspect its details. You can edit its metadata later, but its type and opening balance are fixed after creation. A wallet can only be deleted when it has no movements or linked cards. The shareable preference does not grant another user access.

### 3. Record income, expenses and transfers

Use **New movement** from the dashboard or the movements page at `/dashboard/transaction`. Select the kind, enter a positive amount, choose the date and wallet, then select a category for income or expenses. A transfer needs a source and a different destination wallet. Add a description or optional notes, then save.

On desktop, the editor shows the complete form. On phones, it uses two steps: the essential fields, followed by a summary and optional notes. Only the final save submits the movement.

Existing movements have edit and delete actions. Transfers update both participating wallets together and are excluded from income, expense and savings totals.

### 4. Review your finances

Open `/dashboard` for your overview and change the selected month in the chart to inspect another period. Wealth and wallet distribution always show **current balances**; changing the month changes movement totals, rather than reconstructing past wealth.

Use the movements page to filter and explore your data. Choose **Export** to download the complete filtered result as CSV. This user export is separate from the full database ZIP archives used by administrators.

### 5. Make it yours

Use the application header to change language or appearance. English URLs have no locale prefix; Italian URLs start with `/it`, for example `/it/dashboard`. On mobile, the bottom navigation provides Home, Movements and More; open More to reach wallets and the rest of the navigation.

## Inside the repository

```text
frontend/                    Next.js application and responsive UI
backend/webserver/           ASP.NET Core /api/v1 endpoints and accounts
backend/logic/               Financial commands and ownership rules
backend/database/            EF Core model and schema validation
backend/ExportImportApplication/  Manual database administration CLI
docs/                        Setup guides and OpenAPI snapshot
docker-compose.yml           MySQL, production application and database tools
settings.example.json        Backend configuration template
.env.example                 Docker Compose configuration template
```

The browser uses HttpOnly Identity cookies and antiforgery protection. The backend owns financial validation, balances and persistence; the bundled MySQL container stores account and financial data in the `mysql-data` volume. Application endpoints live under `/api/v1` and return Problem Details errors.

## Documentation

- [Development](docs/development/README.md) — prerequisites, configuration, local startup and troubleshooting.
- [Production](docs/production/README.md) — Docker Compose, HTTPS, persistent storage, backups and upgrades.
- [Database tools](backend/ExportImportApplication/README.md) — initialization, ZIP export/import and explicit deletion.
- [API contract](docs/openapi/v1.json) — versioned OpenAPI snapshot; interactive Swagger is available in Development.
- [Dashboard](frontend/src/features/dashboard/README.md), [wallets](frontend/src/features/wallets/README.md) and [movements](frontend/src/features/transactions/README.md) — implementation notes and feature boundaries.

## Working on the project

Read [AGENTS.md](AGENTS.md) and the relevant [frontend](frontend/AGENTS.md) or [backend](backend/AGENTS.md) instructions before making changes. The [AI workflow](docs/AI_WORKFLOW.md) explains the repository's assistant conventions.

Use `npm --prefix frontend run build` to verify frontend code changes and `dotnet build backend/backend.sln` for backend changes. Documentation-only changes require link/consistency checks and `git diff --check`, without builds or application startup.
