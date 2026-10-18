**[Documentation](README.md) / Part III · Development and operations**

# 09 · Operations and recovery

> Deploy, monitor and recover an instance with the administrative tools.

<details>
<summary><strong>On this page</strong></summary>

- [9.1 Deployment requirements](#91-deployment-requirements)
- [9.2 Health checks](#92-health-checks)
- [9.3 Logs, correlation and metrics](#93-logs-correlation-and-metrics)
- [9.4 What a backup contains](#94-what-a-backup-contains)
- [9.5 Create a backup](#95-create-a-backup)
- [9.6 Restore into staging](#96-restore-into-staging)
- [9.7 Cutover and rollback](#97-cutover-and-rollback)
- [9.8 Recovery drills and key storage](#98-recovery-drills-and-key-storage)

</details>

---

## 9.1 Deployment requirements

The supplied Compose configuration runs the backend and frontend with MySQL external to the stack. Backend host exposure defaults to loopback. The backend container runs as a non-root user with a read-only root filesystem, writable log/key volumes and temporary storage. The frontend waits for backend health.

For a public deployment, provide HTTPS, a browser-reachable API URL, exact allowed frontend origins, working SMTP and persistent protected Data Protection keys. Keep frontend/API endpoints compatible with the configured SameSite=Lax cookies, preferably through a same-site deployment. Merely exposing the default HTTP ports is not a complete production authentication setup.

Inspect proxy behavior before deploying: the current pipeline uses HTTPS redirection but does not explicitly register forwarded-header middleware. A TLS-terminating proxy needs a reviewed scheme/host arrangement; do not assume arbitrary proxy headers are automatically trusted.

For an update, stop all application writers, preserve the original database and a verified backup, export using the source release's administrative tool, then import using the destination release's tool into a different empty database. Only after a successful import, manually change the application configuration and start the compatible release. Startup never updates the database. See the [manual update workflow](database-migration-redesign.md).

## 9.2 Health checks

| Endpoint | Check | Typical response | Operational use |
| --- | --- | --- | --- |
| GET `/health/live` | Process pipeline only; no database query | 200 `{ "status": "Healthy" }` | Determine whether the host responds |
| GET `/health/ready` | MySQL connection and `SELECT 1` within configured timeout | 200 Healthy, or 503 Unhealthy | Decide whether the instance should receive traffic |

Responses use `Cache-Control: no-store` and do not include connection details. A healthy readiness check does not prove SMTP delivery, complete browser login or correct financial data after an external manual change. Read-only validation runs before normal startup completes.

```powershell
Invoke-RestMethod http://localhost:5256/health/live
Invoke-RestMethod http://localhost:5256/health/ready
```

The container healthcheck runs `dotnet webserver.dll --healthcheck`, probing readiness at `http://127.0.0.1:8080`. It uses a five-second client timeout; increasing the readiness timeout above that does not increase the helper's timeout. Account for both when interpreting container health.

## 9.3 Logs, correlation and metrics

Use console/container logs or the file sink configured in [chapter 06](06-settings-reference.md). Settings changes require restart. Preserve the technical `X-Trace-ID` and `X-Correlation-ID` when investigating a failure; Problem Details carries the same request trace ID where supplied.

Request logging avoids bodies, response payloads and Authorization/cookie headers. EF diagnostics omit SQL parameter values and require Development plus an explicit switch and Trace/Verbose. File retention is measured in files; size rolling can consume multiple retained files in one day.

Metrics are exposed without account authentication at the configured path, default `/metrics`. Limit access through the network or proxy. Current metrics include:

| Metric | Meaning |
| --- | --- |
| `moneygestor_http_requests_total` | Observed HTTP requests |
| `moneygestor_http_errors_total` | Responses with status 400 or greater |
| `moneygestor_auth_rejects_total` | 401 responses |
| `moneygestor_database_probe_failures_total` | Recorded readiness/database failures |
| `moneygestor_concurrency_retries_total` | Retried concurrent write attempts |
| `moneygestor_http_request_duration_milliseconds` | Request-duration histogram |

Counters live in the process and reset on restart. They do not have user/resource labels. Health probes are observed requests; metrics scraping itself is excluded when the metrics path is enabled. Metrics availability does not imply an installed monitoring or alerting service.

## 9.4 What a backup contains

Native SQL backups use MySQL clients and the scripts in [ops/database](../../ops/database). These backups preserve a schema for recovery. The separate [versioned ZIP/CSV tool](database-migration-redesign.md) is used to rebuild data into the current schema for an update.

A backup is a `.mgbak` **directory**, containing `database.sql` and `manifest.json`. It includes the full selected schema, financial/user data, Identity password hashes, schema version metadata and database objects captured by mysqldump. The manifest records inventory, size and SHA-256.

It does **not** include MySQL server accounts/grants, server configuration, the ASP.NET Data Protection key ring, local settings or SMTP secrets. Preserve those separately through protected operational procedures. SHA-256 detects accidental corruption; it does not encrypt a dump or establish its authenticity.

Use encrypted restricted storage. Pause DDL/migrations during the dump. The scripts require InnoDB tables for a consistent `--single-transaction` snapshot and reject unsupported table engines. There is no built-in schedule or automatic backup-retention policy.

## 9.5 Create a backup

Requirements: PowerShell 7, MySQL 8.4 `mysql` and `mysqldump` in PATH, and a protected login path for a suitably privileged administrative account.

The current backup script specifically requires the login-path name **`client`**; a different login-path name is rejected. Configure it interactively:

```powershell
mysql_config_editor set --login-path=client --host=127.0.0.1 --port=3306 --user=moneygestor_ops --password
```

Then run against your verified target and protected output directory:

```powershell
pwsh -File .\ops\database\New-MoneyGestorBackup.ps1 `
  -Database moneygestor_db `
  -LoginPath client `
  -Server 127.0.0.1 `
  -Port 3306 `
  -OutputDirectory E:\MoneyGestorBackups
```

Replace the example database, host and directory with your installation values. Keep both files together. A successful dump is published only after a nonempty file, manifest and checksum are produced. MySQL login-path storage obfuscation is not a replacement for filesystem permissions or encryption.

## 9.6 Restore into staging

Restore always targets a **new, nonexisting** database with prefix `mg_restore_`. It does not overwrite the source database, apply migrations or automatically switch application traffic.

```powershell
pwsh -File .\ops\database\Restore-MoneyGestorToStaging.ps1 `
  -BackupPath E:\MoneyGestorBackups\moneygestor-20261005T120000Z.mgbak `
  -StagingDatabase mg_restore_review_20261005 `
  -LoginPath client `
  -Server 127.0.0.1 `
  -Port 3306
```

The backup path is illustrative; select an actual completed backup. The script verifies format, filename, length, checksum, schema metadata, table inventory, schema version marker and table checks. If it fails after staging creation, staging remains available for inspection. Do not promote a failed restore.

## 9.7 Cutover and rollback

1. Schedule maintenance and stop all backend writers.
2. Complete and verify staging restore; keep the original schema and a verified backup.
3. Privately change the application database name to the verified staging schema and use a release compatible with its schema version.
4. Start one instance and check startup/readiness, a controlled login, wallet/transaction reads and read-only balance reconciliation.
5. If checks fail, stop the instance, restore the previous configuration and compatible application version, and verify the original schema again.
6. If checks pass, reopen traffic and retain the old schema according to the agreed retention procedure.

MySQL does not provide an atomic whole-schema swap for this workflow. Avoid sequential table renames or deleting the original as a cutover shortcut. Record versions, timings, backup identity and verification outcomes without secrets or personal payloads. Measure recovery time/data loss from a drill rather than promising unmeasured RTO/RPO values.

## 9.8 Recovery drills and key storage

[Invoke-MoneyGestorRecoveryDrill.ps1](../../ops/database/Invoke-MoneyGestorRecoveryDrill.ps1) exercises backup and staging restore against a sacrificial `mg_drill_*` or `mg_restore_*` source. Use synthetic isolated data and the [recovery runbook](../../docs/all_modernization/backend-modernization/DATABASE_RECOVERY.md). Cleanup is manual.

Keep the Data Protection key storage persistent across container replacement and separate from the MySQL dump. Compose supplies `backend-data-protection`. Removing that volume can invalidate cookies and outstanding account links; `docker compose down -v` removes named volumes and is unsuitable for ordinary redeployment.


---

| Previous | Documentation | Next |
| :--- | :---: | ---: |
| [← Database and business rules](08-database-and-business-rules.md) | [Index](README.md) | [Development and troubleshooting →](10-development-and-troubleshooting.md) |
