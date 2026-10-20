# Develop MoneyGestor

**From a fresh checkout to a local development environment.**

[Overview](../../README.md) · **Development** · [Production](../production/README.md) · [Database tools](../../backend/ExportImportApplication/README.md)

---

Run the Next.js frontend and ASP.NET Core API as separate processes, backed by your own local MySQL database. The commands below use PowerShell and start from the repository root unless stated otherwise.

## Prerequisites

| Tool | Repository requirement |
| --- | --- |
| Node.js and npm | Node.js 22 is used by the frontend Dockerfile and CI. Install dependencies with `npm ci`. |
| .NET SDK | SDK `10.0.400` is selected by [global.json](../../global.json), with `latestFeature` roll-forward. Projects target `net10.0`. |
| MySQL | Use the bundled MySQL 8.4 service with Docker Compose v2, or your own reachable server. |
| Database permissions | Initialization requires permission to create the selected database and its schema. Runtime access needs permissions for application reads and writes. |
| SMTP, if enabled | Required for confirmation and recovery emails. You can disable confirmation for a local development account. |

Docker is optional if you already have MySQL. Otherwise, start only the `mysql` service from the root Compose file and run the frontend/API natively for hot reload.

## First-time setup

### 1. Create your local configuration

Create a private settings file from the committed template, only if you do not already have one:

```powershell
Copy-Item settings.example.json settings.json
```

Edit it privately and set `database.host`, `port`, `name`, `user` and `password` to your **development** database. The template defaults to the Compose hostname `mysql`; for an API running on your computer, change the host to `127.0.0.1` and use the published MySQL port (default `3306`). The template values are placeholders, not production credentials.

If using the bundled database, also create the private root `.env` file from its template, only if it does not already exist:

```powershell
Copy-Item .env.example .env
```

Choose separate private values for `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD`. Match `MYSQL_DATABASE`, `MYSQL_USER` and `MYSQL_PASSWORD` to `database.name`, `database.user` and `database.password` in the application JSON. The API does not connect as root. Single-quote `.env` values containing `$` to prevent interpolation; use the actual unquoted password in JSON, escaped according to JSON syntax.

Start only MySQL and wait for its healthcheck:

```powershell
docker compose up -d --wait mysql
```

This prepares the MySQL server, an empty application database and its database-scoped user. It does not create the MoneyGestor tables. Data persists in `mysql-data` across container recreation. Environment bootstrap values apply only to a fresh volume; changing `.env` later does not rename an existing database or rotate its passwords.

If port `3306` is already occupied, change `MYSQL_PORT` in `.env` (for example to `3307`) and match that port in the native API's JSON settings. Connections between Compose services always use `mysql:3306`, independently of the published host port.

Keep `security.allowedOrigins` aligned with your browser's frontend origin:

```json
"security": {
  "requireConfirmedEmail": false,
  "allowedOrigins": ["http://localhost:3000"]
}
```

This is a section to merge into the full template. Setting `requireConfirmedEmail` to `false` allows local registration and login without confirmation. To develop the email flows, set it to `true` and configure a reachable SMTP service instead.

The example SMTP host is also a placeholder. If you are not using SMTP locally, set `email.host` and `email.from` to `null`. Password recovery will remain unavailable until email delivery is configured. Keep `email.frontendBaseUrl` at `http://localhost:3000` when testing email links locally.

> [!IMPORTANT]
> `settings.json` and local environment files are Git-ignored. Keep credentials there, outside source control. The backend reads application options from the selected JSON file; environment variables such as `database__password` and `security__allowedOrigins__0` do not override those options.

### 2. Select and initialize the database

Point the backend and administrative CLI at the same absolute settings path:

```powershell
$env:BACKEND_APP_SETTINGS = Join-Path (Get-Location).Path 'settings.json'
```

Verify the configured server and database privately. For a **new, missing or empty development database**, run:

```powershell
dotnet run --project backend/ExportImportApplication -- initialize --configured-database
```

The CLI displays its target without printing credentials. Initialization creates the database if it is missing, creates the schema and required reference data, and marks the schema ready. An existing destination must be empty; existing tables are not overwritten.

If you already have a compatible initialized database, skip this command. To restore an archive, follow the [database tools guide](../../backend/ExportImportApplication/README.md) instead of initializing first.

The API validates schema version, reserved data and financial integrity during startup. It never creates, migrates, seeds or repairs the database. Do not use `dotnet ef database update` as a setup step; this checkout uses the explicit initialization/export/import workflow.

The shared data integrity preflight currently skips wallet balance reconciliation (`wallet_balance_mismatch`): that check is commented out, while ownership and transfer checks remain active. This allows inconsistent stored balances to pass the preflight without repairing them.

### 3. Install frontend dependencies

```powershell
npm --prefix frontend ci
```

This installs from the committed lockfile without upgrading dependencies.

## Start development

### Terminal 1: API

```powershell
$env:BACKEND_APP_SETTINGS = Join-Path (Get-Location).Path 'settings.json'
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project backend/webserver --no-launch-profile --urls http://localhost:5256
```

Using `--no-launch-profile` makes the URL and settings path explicit, independent of the IDE's launch profile. Keep this terminal open; stop the process with Ctrl+C.

### Terminal 2: website

```powershell
$env:NEXT_PUBLIC_API_URL = ''
npm --prefix frontend run dev
```

Open `http://localhost:3000` and follow the [application walkthrough](../../README.md#how-to-use-moneygestor). Next.js reloads frontend changes during development. Restart the API after backend changes, or use your IDE's normal development workflow.

| Address | Purpose |
| --- | --- |
| `http://localhost:3000` | Website in English. |
| `http://localhost:3000/it` | Website in Italian. |
| `http://localhost:3000/dashboard` | Authenticated dashboard. |
| `http://localhost:5256/swagger` | Interactive API reference in Development. |
| `http://localhost:5256/health/live` | API process liveness. |
| `http://localhost:5256/health/ready` | Database readiness. |
| `http://localhost:3000/design-system` | UI development catalog with fixture previews. |

The browser sends `/api/v1/*` requests to the website's own origin. Next.js proxies them to `http://127.0.0.1:5256`, preserving the API path, cookies and antiforgery headers. You can also open the website from another device using the frontend computer's LAN address: only the frontend needs to reach the API. Keep email links aligned with the website address.

### Configure the API proxy

For an API running on another machine or port, create `frontend/.env.local` with its origin, without `/api/v1`:

```dotenv
API_PROXY_TARGET=http://192.0.2.10:5256
NEXT_PUBLIC_API_URL=
```

`API_PROXY_TARGET` defaults to `http://127.0.0.1:5256` and is used only by the Next.js server. Restart `next dev` after changing it; for `next start` or standalone output, set it before building and rebuild when it changes. A variable already set in the process environment takes precedence over the file.

Leave `NEXT_PUBLIC_API_URL` empty or unset to use the proxy. An explicit nonempty value makes the browser call that API origin directly, bypassing the proxy; this requires matching CORS configuration in `security.allowedOrigins` and compatible cookie hostnames. It is public build-time configuration and must never contain credentials.

## Where to make changes

| Area | Starting point |
| --- | --- |
| Routes and layouts | `frontend/src/app/[locale]` |
| Live dashboard, wallets and movements | `frontend/src/features` |
| UI primitives and shared forms | `frontend/src/components/ui`, `frontend/src/components/shared` |
| API calls and session handling | `frontend/src/lib/api/client.ts` |
| Translations | `frontend/messages/en`, `frontend/messages/it` |
| HTTP endpoints | `backend/webserver/Controllers/V1` |
| Authentication and accounts | `backend/webserver/Auth` |
| Financial commands and validation | `backend/logic` |
| Persistence and schema version | `backend/database` |

Read the relevant [frontend](../../frontend/AGENTS.md) or [backend](../../backend/AGENTS.md) instructions. Reuse the shared API client: it sends Identity cookies and obtains antiforgery tokens for mutations. Do not introduce browser-stored authentication tokens.

## Verify a change

For frontend changes:

```powershell
npm --prefix frontend run build
```

For backend changes:

```powershell
dotnet build backend/backend.sln
```

For documentation-only changes, check relative links and consistency, then run `git diff --check`. No build is required. These are the repository's default checks; do not independently add tests, browser checks, servers or separate frontend lint/typecheck/format runs without an explicit request. The startup instructions above are for developers who want to run the website, not an additional verification requirement.

A successful build verifies compilation. If it fails, report whether the error was introduced by the change or already existed. The backend instructions identify historical `TestProject` consumers of removed APIs as a possible existing solution-build blocker; do not disable errors to obtain a passing build.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Settings file not found | Use an absolute `BACKEND_APP_SETTINGS` path in the API terminal. Relative paths resolve from the process working directory. |
| Database missing, incomplete or incompatible | Confirm the target, connectivity and schema. Initialize only a new/empty database; use manual export/import for an upgrade. |
| Native API cannot reach the bundled MySQL | Start `mysql`, wait for health, use `127.0.0.1` and `MYSQL_PORT` in JSON, and match the database/user/password from `.env`. |
| MySQL remains unhealthy after editing `.env` | Bootstrap variables do not change existing users/passwords in `mysql-data`. Restore matching credentials or rotate them deliberately in MySQL; do not remove the volume to reset a password. |
| API proxy cannot reach the backend | Check that the API is running and `API_PROXY_TARGET` is reachable from the Next.js server; restart Next.js after changes. |
| Browser requests bypass the proxy | Remove a nonempty `NEXT_PUBLIC_API_URL` from the terminal environment or frontend environment files, then restart Next.js. |
| CORS or cookie errors with direct API calls | Leave `NEXT_PUBLIC_API_URL` empty to use the proxy, or check the exact frontend origin in `security.allowedOrigins` and use compatible frontend/API hostnames. |
| Registration works but login fails | Confirm your email if required, or disable confirmation for local development. Check SMTP configuration when testing email flows. |
| Confirmation/reset email never arrives | Replace example SMTP values; disabling confirmation does not enable password recovery. |
| Login is temporarily locked | Repeated failed attempts trigger account lockout; the configured lockout duration is 15 minutes. |
| API returns an antiforgery error | Use the shared client. Custom callers must fetch `/api/v1/auth/antiforgery`, retain cookies and send `X-CSRF-TOKEN`; refresh the token after login/logout. |
| SDK resolution fails | Install an SDK satisfying `global.json` and inspect `dotnet --list-sdks`. |

For a compiled deployment with HTTPS and persistent sessions, continue with the [production guide](../production/README.md).
