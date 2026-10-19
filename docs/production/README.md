# Run MoneyGestor in production

**Deploy the compiled website with HTTPS, persistent sessions and a database you control.**

[Overview](../../README.md) · [Development](../development/README.md) · **Production** · [Database tools](../../backend/ExportImportApplication/README.md)

---

The repository includes a [Docker Compose setup](../../docker-compose.yml) for MySQL 8.4, the frontend, API and one-off database tools. Install Docker Compose v2 and provide an HTTPS reverse proxy; the database server is included.

## Deployment model

```text
Browser
   │ HTTPS · your public domain
   ▼
Reverse proxy
   ├── /api/* ──► API       127.0.0.1:5000 ──► mysql:3306
   └── /*     ──► Frontend  127.0.0.1:3000
```

The frontend is built with an empty `NEXT_PUBLIC_API_URL`, so browser API requests use the website's own origin. Your reverse proxy must route `/api/*` to the API while preserving the path.

> [!IMPORTANT]
> Production authentication uses Secure cookies. Access the website through HTTPS. Opening the container's plain HTTP port directly is not the production login workflow.

The examples below use a Linux host with Docker Compose v2 and a reverse proxy running on that same host. Run commands from the repository root. Replace `moneygestor.example.com` and certificate paths with your own values.

## 1. Prepare configuration

Create private configuration files from the templates, only if they do not already exist:

```bash
cp .env.example .env
cp settings.example.json settings.json
chmod 600 .env settings.json
```

Edit them privately. Neither file belongs in source control.

### Application settings

Use [settings.example.json](../../settings.example.json) as the full schema. Set these fields for your installation:

| Setting | Production value |
| --- | --- |
| `database.host` | `mysql`, the Compose service name (already set in the template). |
| `database.port` | `3306`, the container port, regardless of `MYSQL_PORT` on the host. |
| `database.name`, `user`, `password` | Match `MYSQL_DATABASE`, `MYSQL_USER` and `MYSQL_PASSWORD` in `.env`. |
| `security.allowedOrigins` | Your exact website origin, for example `["https://moneygestor.example.com"]`. |
| `security.requireConfirmedEmail` | `true` when confirmation is required; configure SMTP accordingly. |
| `email.host`, `port`, `username`, `password`, `from`, `useSsl` | Working SMTP delivery settings. |
| `email.frontendBaseUrl` | Your public HTTPS website URL, used in confirmation and reset links. |
| `log.output.file.path` | A directory under `/app/log` to keep file logs in the mounted volume. The example's relative path resolves there. |
| `observability` | Readiness timeout and optional metrics configuration; defaults are provided in the template. |

The backend refuses to start in Production when confirmation is required and the SMTP host/from fields are absent. Startup does not test SMTP connectivity: validate delivery as part of your deployment acceptance. If confirmation is disabled, password recovery still needs SMTP.

Application settings come from the JSON file mounted read-only at `/app/settings.json`, selected by `BACKEND_APP_SETTINGS`. Generic `database__...` or `security__...` environment variables do not override this JSON configuration.

The API and tools reach MySQL over the private `database` Compose network. `localhost` inside a container refers to that container; use `mysql` for this deployment. A native API running on your computer instead uses `127.0.0.1` and the published host port, as described in the [development guide](../development/README.md).

### Compose settings

The root `.env` controls Compose interpolation, rather than replacing application settings:

| Variable | Default / purpose |
| --- | --- |
| `COMPOSE_PROJECT_NAME` | `moneygestor`; keep stable to retain the same named volumes. |
| `APP_SETTINGS_FILE` | `./settings.json`; host path to the application JSON file. |
| `MYSQL_ROOT_PASSWORD` | Required, private MySQL administrator password; replace the example placeholder. |
| `MYSQL_DATABASE` | `moneygestor_db`; database created on the first MySQL startup. |
| `MYSQL_USER`, `MYSQL_PASSWORD` | Application user and its required private password; match the application JSON. |
| `MYSQL_BIND_ADDRESS`, `MYSQL_PORT` | `127.0.0.1`, `3306`; host listener for native tools/development. |
| `FRONTEND_BIND_ADDRESS`, `FRONTEND_PORT` | `127.0.0.1`, `3000`; frontend host listener. |
| `BACKEND_BIND_ADDRESS`, `BACKEND_PORT` | `127.0.0.1`, `5000`; API host listener. |
| `ARCHIVE_DIRECTORY` | `./artifacts/archives`; export destination on the host. |
| `IMPORT_ARCHIVE_PATH` | `./artifacts/archives/import.zip`; archive mounted for import. |
| `MONEYGESTOR_MAINTENANCE_CONFIRMED` | `false`; tools require explicit maintenance acknowledgement for export/import. |
| `TRANSFER_UID`, `TRANSFER_GID` | `0`, `0` for export/import; set host-appropriate IDs for archive ownership. |

Keep the listeners bound to loopback for the host-proxy topology above. If your proxy runs in a container or on another host, adjust connectivity explicitly; `127.0.0.1` inside a proxy container does not reach the Docker host.

Choose distinct root and application passwords before first startup. Single-quote `.env` values containing `$` to prevent interpolation; copy the actual password into JSON with JSON escaping. The API uses the application user, never root. Compose rejects missing/empty password variables, but you must replace the nonempty example placeholders yourself.

MySQL's bootstrap variables create the database and user only when `mysql-data` is empty. Editing `.env` later does not rotate passwords, rename databases or change grants in an existing volume. Apply those changes deliberately in MySQL and update the matching private configuration. See the [official image documentation](https://hub.docker.com/_/mysql) for bootstrap behavior.

Make the settings file readable by the backend and initialization container's `app` user while restricting host access. A root-owned file with mode `600` is not readable by that non-root user: arrange an appropriate owner, group or ACL before launch. The read-only mount does not grant file permissions.

## 2. Start MySQL and initialize the application

Confirm the database name and credentials in `.env` and the selected settings file. Start MySQL first and wait for its readiness check:

```bash
docker compose up -d --wait mysql
```

The server creates an empty `MYSQL_DATABASE` and grants the application user privileges on that database. Its healthcheck uses an authenticated TCP query against the selected database, so it waits for normal server startup. It does not require MoneyGestor tables to exist.

For a **first installation with an empty application database**, build and run the tool:

```bash
docker compose --profile tools build initialize
docker compose --profile tools run --rm initialize
```

Initialization prepares the MoneyGestor schema and required data. It refuses a nonempty destination. Skip it for an already initialized compatible database, or use import to restore an archive into a fresh destination. Starting `mysql` alone does not create the application tables.

The bundled application user has the privileges needed to initialize tables inside `MYSQL_DATABASE`. To use another database, an administrator must grant it access first. For separate administration credentials, select a protected JSON file with `APP_SETTINGS_FILE=/secure/moneygestor-admin.json` for the tool command, then retain application credentials in the normal runtime configuration.

The API only validates the database at startup. It does not run incremental EF migrations or modify an incompatible schema.

## 3. Build and start the application

```bash
docker compose build backend frontend
docker compose up -d backend frontend
docker compose ps
docker compose logs --tail=100 backend frontend
```

The API and database tools wait for healthy MySQL; the frontend waits for a healthy backend. These dependencies do not run the initialization tool automatically. Compose sets `ASPNETCORE_ENVIRONMENT=Production`, persists Data Protection keys and logs, and runs the application containers as non-root users with read-only root filesystems and dedicated writable mounts. MySQL uses the official image's normal database entrypoint and a writable data volume.

Next.js emits a standalone application, started by `node server.js` in the image. Do not use `next dev` for production. The API image contains the published .NET application and runtime, without the SDK.

`NEXT_PUBLIC_API_URL` is a **build-time** setting. The supplied Compose file passes an empty value for same-origin routing. Setting it only in a running frontend container does not change the browser bundle. A different API origin requires changing the image build argument, rebuilding and reviewing CORS/cookie requirements.

## 4. Route HTTPS traffic

For an Nginx proxy installed on the Docker host, adapt the following server blocks within the existing `http` configuration. This is an example to install yourself, not a service bundled with Compose. Obtain valid TLS certificates first.

```nginx
server {
    listen 80;
    server_name moneygestor.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name moneygestor.example.com;

    ssl_certificate     /etc/letsencrypt/live/moneygestor.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/moneygestor.example.com/privkey.pem;

    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

Preserve `/api/v1/...` in the upstream request: adding a trailing `/` to the API `proxy_pass` above would strip the matching `/api/` prefix. Forward the original HTTPS scheme so the API's HTTPS redirection sees the browser's scheme. Compose enables forwarded-header handling; keep direct backend access restricted to the intended proxy/network.

The example leaves backend health and metrics endpoints accessible through the local backend listener, rather than publishing them through the website. Swagger is disabled in Production.

Open your HTTPS domain, register an account, complete confirmation if enabled and follow the [usage walkthrough](../../README.md#how-to-use-moneygestor). Italian is available under `/it`.

## Persistent data and monitoring

| Resource | Where it lives | Operational role |
| --- | --- | --- |
| Financial data and accounts | `mysql-data` named volume at `/var/lib/mysql` | Persists across MySQL container recreation; make consistent backups. |
| Identity encryption keys | `backend-data-protection` named volume | Preserve and protect across restarts and releases. |
| API file logs | `backend-logs` named volume | Retained using the JSON logging settings. |
| ZIP archives | `ARCHIVE_DIRECTORY` on the host | Full database export/import artifacts. |
| Private configuration | `APP_SETTINGS_FILE` on the host | Read-only container mount. |

Keep the Compose project name and named volumes stable. Losing Data Protection keys invalidates existing cookies and account tokens. ZIP exports contain logical database records, not the MySQL data directory, key volume or private configuration. Protect and back up the keys/configuration separately. `docker compose down` retains named volumes; `docker compose down -v` also deletes `mysql-data` and permanently removes the bundled database. Do not use it for routine updates or password resets.

The MySQL host port is bound to loopback by default. If another local MySQL instance occupies it, change `MYSQL_PORT`; container-to-container connections remain `mysql:3306`.

Operational endpoints on the backend listener:

| Path | Meaning |
| --- | --- |
| `/health/live` | The HTTP process is responding; it does not query MySQL. |
| `/health/ready` | Database readiness with the configured timeout; also used by the container healthcheck. |
| `/metrics` | Prometheus-format metrics when enabled; the path is configurable. |

Use `docker compose ps` and container logs to inspect startup and health. Keep monitoring endpoints restricted. A healthy process or container does not verify registration, email delivery or financial interactions.

## Backup, restore and upgrade

ZIP exports include account and financial data, including Identity password hashes. They are not encrypted backups; restrict access, encrypt stored copies and protect off-host transfers.

### Export a consistent archive

Stop the website/API and **all other writers** before exporting. The acknowledgement flag does not stop processes for you.

Keep `mysql` running while the export/import tools work; stop only the writers.

```bash
docker compose stop frontend backend
MONEYGESTOR_MAINTENANCE_CONFIRMED=true docker compose --profile tools run --rm export
```

The tool creates a new `export-yyyy-MM-dd-HHmmss.zip` in `ARCHIVE_DIRECTORY`, using UTC and without overwriting existing files. With default settings, exports are root-owned; set the transfer UID/GID as appropriate. Back up the resulting file outside the deployment host.

After checking that the export succeeded, restart the application:

```bash
docker compose up -d backend frontend
```

### Restore into a fresh database

1. Stop the application and every writer.
2. Keep the original database and configuration available for recovery.
3. Prepare a **new, empty** target database and grant the application user access, then select it in your private application settings. Do not initialize it first. The bundled user is initially scoped only to `MYSQL_DATABASE`; changing that variable does not provision a second database in an existing volume.
4. Set `IMPORT_ARCHIVE_PATH` to the archive on the host.
5. Run the import and check that it completes successfully:

For step 3, an administrator can open an interactive MySQL prompt (the password is requested without being placed in command arguments):

```bash
docker compose exec mysql mysql --user=root --password
```

For example, replace the destination and user below with your intended database and `MYSQL_USER`:

```sql
CREATE DATABASE moneygestor_restore;
GRANT ALL PRIVILEGES ON moneygestor_restore.* TO 'moneygestor_user'@'%';
```

Exit the SQL prompt after checking the target and grants. Run step 5 from your shell:

```bash
MONEYGESTOR_MAINTENANCE_CONFIRMED=true docker compose --profile tools run --rm import
```

Then start `backend frontend` with `docker compose up -d backend frontend` and check health and logs. Import validates the archive and prepares the destination; it does not overwrite an existing populated database or change your configuration for you. If it fails, inspect the destination and any partial state before retrying.

### Release updates

Before deploying a new revision, make a consistent backup and retain the previous images and configuration. Rebuild the application images and the transfer image when its code changes. If the database schema remains compatible, start the updated `backend frontend` services and inspect health/logs.

When a release changes the required schema, use compatible export/import tools to prepare a new database, then switch configuration deliberately. Keep the old database for rollback; startup never upgrades it automatically. Roll back application images and matching database/configuration together when necessary. Database engine upgrades are separate: retain the MySQL 8.4 series unless you have planned and backed up an engine migration.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Backend exits immediately | Settings mount and permissions, database connectivity/schema, Production SMTP requirement and persistent key path. |
| Frontend waits or does not start | Backend health; inspect its logs first. |
| Login fails over plain HTTP | Use the public HTTPS domain so Secure cookies can be sent. |
| API calls return frontend HTML/404 | Route `/api/*` to port 5000 and preserve the full API path. |
| HTTPS redirect loops | Forward the original scheme and verify forwarded-header processing and proxy access. |
| Database connection fails in Docker | Container-reachable hostname, MySQL listener/grants and firewall; `localhost` is the container itself. |
| MySQL is unhealthy or refuses authentication | Check bootstrap credentials against the existing volume. Editing `.env` does not change existing MySQL accounts. Inspect `docker compose logs mysql` privately. |
| MySQL host port is already allocated | Change `MYSQL_PORT` for the host listener; keep container JSON settings at `mysql:3306`. |
| Import to a different database is denied | Create the destination and grant the application user access using an administrator; changing `MYSQL_DATABASE` alone does not update an existing volume. |
| Sessions disappear after a release | Check the Compose project name, Data Protection volume and key permissions. |
| Import/export refuses to run | Stop all writers and explicitly set `MONEYGESTOR_MAINTENANCE_CONFIRMED=true` for that invocation. |
| Email links point to localhost | Set `email.frontendBaseUrl` to the public HTTPS URL and restart the backend. |

For native local setup and code changes, use the [development guide](../development/README.md). For exact CLI arguments and exit codes, use the [database tools guide](../../backend/ExportImportApplication/README.md).
