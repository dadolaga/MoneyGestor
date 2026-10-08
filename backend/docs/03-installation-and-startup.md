**[Documentation](README.md) / Part I · The application**

# 03 · Installation and startup

> Set up a local instance, configure its services and launch the application.

<details>
<summary><strong>On this page</strong></summary>

- [3.1 Prerequisites](#31-prerequisites)
- [3.2 Prepare the configuration](#32-prepare-the-configuration)
- [3.3 Initialize a fresh database](#33-initialize-a-fresh-database)
- [3.4 Run the backend locally](#34-run-the-backend-locally)
- [3.5 Run the frontend locally](#35-run-the-frontend-locally)
- [3.6 Run with Docker Compose](#36-run-with-docker-compose)
- [3.7 First functional check](#37-first-functional-check)

</details>

---

## 3.1 Prerequisites

| Component | Repository requirement | Purpose |
| --- | --- | --- |
| .NET SDK | `global.json` requests 10.0.400, allows later feature bands and disallows prereleases | Backend build and development |
| Node.js / npm | Node 22 is used by the frontend Dockerfile | Frontend development and build |
| MySQL | MySQL 8.4 is the integration-test and operations baseline | Persistent application database |
| SMTP server | Working server and sender when confirmation is enabled or password recovery is needed | Account confirmation and password reset |
| Docker / Compose | Required for container deployment and backend integration tests | Containers and disposable test database |
| PowerShell 7 and MySQL clients | Required for administrative database scripts | Backup, staging restore and recovery drills |

> [!IMPORTANT]
> MySQL is external to Compose. Install or provide it separately. Use a dedicated development database and user for first installation.

## 3.2 Prepare the configuration

Run commands from the repository root:

```powershell
Copy-Item .\settings.example.json .\settings.json
```

Only copy the example if a local settings file does not already exist. Edit the local file privately to configure MySQL, SMTP, frontend URLs and writable log storage. The placeholders in the example are not working credentials. See the field-by-field [settings reference](06-settings-reference.md).

`settings.json` is ignored by Git. The backend reads the path in `BACKEND_APP_SETTINGS`; without it, `./settings.json` is resolved relative to the process working directory. Relative log paths also depend on the working directory.

## 3.3 Initialize a fresh database

1. Choose a new empty database name and set `database.name` to it.
2. Ensure the configured user can connect and apply schema changes. If the database does not exist, creation also requires appropriate MySQL privileges.
3. Set `database.bootstrapMode` to `Migrate` for the first startup.
4. Start one backend instance. It applies the MoneyGestor and Identity migrations, seeds global colors/types, checks integrity and initializes Identity mappings before serving requests.
5. Check readiness and the account flow, then set bootstrap mode back to `Disabled` and restart.

`Disabled` is the default: missing databases or pending migrations stop startup without applying DDL. A populated historical database lacking the current initial migration is rejected even in `Migrate` mode. Startup never deletes that database or automatically imports its old schema. See [database details](08-database-and-business-rules.md).

Development can start without SMTP. Email confirmation is required by default: configure a development SMTP service for this workflow, or set `security.requireConfirmedEmail=false` to allow immediate login after registration. Production requires SMTP configuration when confirmation is enabled and always requires persistent Data Protection keys. Password recovery requires SMTP in both modes.

## 3.4 Run the backend locally

For reproducible startup, bypass launch profiles and supply absolute settings and environment explicitly:

```powershell
$env:BACKEND_APP_SETTINGS = (Resolve-Path .\settings.json).Path
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:ASPNETCORE_URLS = 'http://localhost:5256'
dotnet restore .\backend\backend.sln --locked-mode
dotnet run --project .\backend\webserver\webserver.csproj --no-launch-profile
```

Open `http://localhost:5256/swagger` for development API documentation. Check `http://localhost:5256/health/ready` for database connectivity after initialization.

The current `http` launch profile also uses port 5256 and provides `BACKEND_APP_SETTINGS=../../settings.json`. The `https` profile exposes `https://localhost:7184` and port 5256. Profiles can supply their own environment values, so inspect [launchSettings.json](../webserver/Properties/launchSettings.json) when changing the startup method. For HTTPS development, configure/trust the local certificate and use the matching API URL in the frontend.

## 3.5 Run the frontend locally

In a second terminal, from the repository root:

```powershell
$env:NEXT_PUBLIC_API_URL = 'http://localhost:5256'
npm --prefix .\frontend ci
npm --prefix .\frontend run dev
```

Open `http://localhost:3000`. Add exactly that origin to `security.allowedOrigins`, and set `email.frontendBaseUrl` to the same frontend URL for account email links. Use `localhost` consistently rather than mixing it with `127.0.0.1`.

For a local production frontend build:

```powershell
$env:NEXT_PUBLIC_API_URL = 'http://localhost:5256'
npm --prefix .\frontend run build
npm --prefix .\frontend run start
```

The public API URL is embedded in browser code at build time. Rebuild when changing it. The current resource and account clients fall back to `http://localhost:5256` when it is absent; setting it explicitly avoids surprises.

## 3.6 Run with Docker Compose

Before building:

- Supply an existing root `settings.json` for the read-only mount.
- Use a MySQL host reachable **from the backend container**. `host.docker.internal` can address a database running on the host; `localhost` inside the container addresses the container itself.
- Use `/app/log/backend` or another path under `/app/log` for file logs; that directory has writable persistent storage.
- Configure working SMTP when confirmation is enabled or password recovery is needed, and the browser-visible frontend origin. Compose sets the backend to `Production`.

```powershell
docker compose up --build -d backend frontend
docker compose ps
docker compose logs -f backend frontend
```

| Service | Default host address | Container port |
| --- | --- | --- |
| Frontend | `http://localhost:3000` | 3000 |
| Backend | `http://localhost:5000` | 8080 |
| MySQL | External; configured in settings | Not provided by Compose |

The frontend waits for backend readiness. Backend logs and Data Protection keys use separate named volumes. Stop the services with `docker compose down`; preserve the key volume across redeployments.

These HTTP addresses describe port exposure. Production cookies are `Secure`: for a real deployment terminate HTTPS at a reverse proxy and provide a browser-reachable API URL. The default Compose frontend build argument points to `http://localhost:5000`; it must be adjusted for remote browsers or an HTTPS public deployment. CORS alone cannot fix cookie/TLS or cross-site restrictions. See [operations](09-operations-and-recovery.md).

## 3.7 First functional check

After readiness reports `Healthy`, register a synthetic test account, verify its email if required, sign in, create a wallet and record an income and expense. Check that the balance and dashboard match the sample in the [user guide](02-user-guide.md). Use disposable development data for this check.


---

| Previous | Documentation | Next |
| :--- | :---: | ---: |
| [← User guide](02-user-guide.md) | [Index](README.md) | [Backend implementation →](04-backend.md) |
