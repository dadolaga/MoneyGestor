# MoneyGestor database tools

**Initialize, archive and restore your installation from the terminal.**

[Overview](../../README.md) · [Development](../../docs/development/README.md) · [Production](../../docs/production/README.md)

---

This .NET 10 CLI provides explicit database administration on Windows and Linux. It is separate from the website's filtered CSV export and does not run automatically when the API starts.

## Get started

Run commands from the repository root. Show help without accessing MySQL:

```powershell
dotnet run --project backend/ExportImportApplication -- --help
dotnet run --project backend/ExportImportApplication -- export --help
```

Running without arguments also shows help. `-h`, `help` and `help export` are supported. The CLI writes help to stdout and errors to stderr.

## Configure the connection

The CLI can share the backend's private application JSON file:

```powershell
$env:BACKEND_APP_SETTINGS = Join-Path (Get-Location).Path 'settings.json'
```

Its `database` section supplies the server, port, database name, user and password. Create your own configuration from [settings.example.json](../../settings.example.json); never commit credentials. Relative settings paths resolve from the process working directory. Without an explicit path, the default is `./settings.json`.

For standalone administration, `MONEYGESTOR_ADMIN_CONNECTION_STRING` is also supported. Supply it privately in the process environment; do not pass credentials as arguments. An explicit `BACKEND_APP_SETTINGS` path takes precedence over this variable. `--configured-database` always uses the JSON configuration and selects `database.name` from it.

For an administrative connection without a JSON path, supply `--database NAME`. Whenever you use this option, its value must exactly match the selected connection's database name, including when that connection comes from JSON. The tool displays the target server, port, database and archive path without printing credentials. Inspect that target before proceeding: initialize, export and import do not ask for interactive approval.

## Choose a command

Prepend `dotnet run --project backend/ExportImportApplication --` to each command:

| Goal | Command |
| --- | --- |
| Initialize a new installation | `initialize --configured-database` |
| Export a consistent full archive | `export --configured-database --maintenance` |
| Restore into a fresh destination | `import --configured-database --file artifacts/archives/family.zip` |
| Select an explicit database | Use `--database moneygestor_dev` instead of `--configured-database`. |
| Permanently delete a database | `delete --database moneygestor_old` |

### Initialize

```powershell
dotnet run --project backend/ExportImportApplication -- initialize --configured-database
```

MySQL must already be running and reachable. You can start the bundled server with `docker compose up -d --wait mysql` after configuring `.env`. The selected database may be missing or empty; the connection needs permission to create the database/schema as applicable. Initialization creates the schema, required reference data and ready marker. It refuses existing tables and does not overwrite them.

Skip this command for an existing compatible installation. To restore a backup, import directly into a missing/empty destination instead of initializing it first.

### Export

Stop the application and **all other writers**, then run:

```powershell
dotnet run --project backend/ExportImportApplication -- export --configured-database --maintenance
```

`--maintenance` acknowledges that writers are already stopped; it does not stop them. Export creates `export-yyyy-MM-dd-HHmmss.zip` in the current directory using UTC. To choose a path, add `--file "artifacts/archives/family backup.zip"`; prepare the parent directory first. Existing archive files are never overwritten, even when automatic names collide.

The ZIP contains account and financial tables plus a versioned manifest, row counts and checksums. It includes Identity password hashes and is not encrypted. Restrict access and protect stored/off-host copies. Data Protection keys and private configuration are outside this archive and require separate backups.

### Import

Stop all writers, select a new destination in the private configuration, then run:

```powershell
dotnet run --project backend/ExportImportApplication -- import --configured-database --file "artifacts/archives/family backup.zip"
```

Import validates the archive before creating destination objects. It creates a missing database, refuses a nonempty database, restores records and validates the result before marking it ready. The current archive format is version 1; unsupported versions are rejected rather than guessed or silently converted.

The CLI does not change the application's configuration. Keep the source database for recovery and point the API at the validated destination deliberately. If an operation fails, inspect the target and any partial output before retrying; do not delete them automatically.

### Delete

Deletion is permanent. Stop all writers, verify the target and obtain a usable backup first. The command requires an explicit `--database NAME`; `--configured-database` is deliberately unavailable for deletion.

It asks you to type the exact database name. An empty response, end of input or a different name cancels the operation. No routine development, deployment or upgrade step requires deleting the source database.

## Use the tools with Docker

The root Compose file includes MySQL 8.4 and exposes `initialize`, `export` and `import` under its `tools` profile. Tools share the application settings mount and wait for healthy MySQL. Configure `database.host` as `mysql`, `database.port` as `3306`, and match the database/user/password to `.env`:

```bash
docker compose up -d --wait mysql
docker compose --profile tools build initialize
docker compose --profile tools run --rm initialize
```

For export/import, the container entrypoint additionally requires `MONEYGESTOR_MAINTENANCE_CONFIRMED=true` after all writers have stopped. Keep MySQL running during these operations. Exports use `ARCHIVE_DIRECTORY` on the host; imports use `IMPORT_ARCHIVE_PATH`.

The initial application user is scoped to `MYSQL_DATABASE`. To import into a different database, create it and grant that user access through an administrator first. Changing `MYSQL_DATABASE` or password variables in `.env` does not update an existing `mysql-data` volume. When running the CLI natively instead, use `127.0.0.1` and the published `MYSQL_PORT` in its JSON connection.

Follow the [production backup and restore procedure](../../docs/production/README.md#backup-restore-and-upgrade) for the complete sequence, archive ownership and persistent resources.

## Terminal behavior and exit codes

The CLI uses standard .NET console colours without additional dependencies, spinners or cursor repositioning. Colours are disabled for redirected streams, a nonempty `NO_COLOR`, `TERM=dumb` or `--no-color`. Status labels remain readable without colour.

```powershell
dotnet run --project backend/ExportImportApplication -- export --help --no-color
```

`--no-color` may appear before or after the command. Initialize/export/import do not require an interactive terminal; deletion retains its standard-input confirmation.

| Exit code | Meaning |
| --- | --- |
| `0` | Success or help displayed. |
| `1` | Operational failure or cancellation. |
| `2` | Invalid arguments or initial configuration. |
