**[Documentation](README.md) / Part II · The implementation**

# 06 · Settings reference

CSV downloads expose Content-Disposition through CORS. Configure proxy streaming timeouts for expected export volumes.

> Configure database access, logging, security, email and observability.

<details>
<summary><strong>On this page</strong></summary>

- [6.1 Configuration sources and precedence](#61-configuration-sources-and-precedence)
- [6.2 Database settings](#62-database-settings)
- [6.3 Logging settings](#63-logging-settings)
- [6.4 Security / CORS settings](#64-security--cors-settings)
- [6.5 Email settings](#65-email-settings)
- [6.6 Observability settings](#66-observability-settings)
- [6.7 Environment variables outside the JSON schema](#67-environment-variables-outside-the-json-schema)
- [6.8 Compose interpolation variables](#68-compose-interpolation-variables)
- [6.9 Configuration checklist](#69-configuration-checklist)

</details>

---

## 6.1 Configuration sources and precedence

The public schema is [settings.example.json](../../settings.example.json). Runtime options and validation are defined in [Settings.cs](../webserver/Settings.cs); loading and startup checks are in [Program.cs](../webserver/Program.cs).

For normal backend startup:

1. ASP.NET Core creates its standard configuration sources.
2. MoneyGestor adds the required JSON file selected by `BACKEND_APP_SETTINGS`, or `./settings.json` when the variable is absent.
3. Environment variables are added again, allowing them to override JSON values.

Use double underscores for nested environment keys, such as `database__host` or `security__allowedOrigins__0`. Binding is case-insensitive. Most options are validated on startup. Logging is also validated before creating the host logger.

> [!IMPORTANT]
> Restart the backend after configuration changes. The JSON provider watches the file, but options, logging and CORS are consumed or configured during startup; live reconfiguration is not guaranteed.

“Code default” below means the value used when the field is omitted from binding. “Example” is the value in the public example, which can differ from the default. Empty defaults in required fields are not usable configuration. Do not publish the real settings file or connection strings.

## 6.2 Database settings

| JSON field | Type | Example | Code default | Purpose and validation |
| --- | --- | --- | --- | --- |
| `database.host` | String | `localhost` | Empty | MySQL server hostname/IP; nonblank required. In Docker, use a host reachable from the container. |
| `database.port` | Unsigned 16-bit integer | `3306` | `0` | MySQL TCP port; 1–65535 required. |
| `database.name` | String | `moneygestor_db` | Empty | Database/schema for both financial and Identity tables; nonblank required. |
| `database.user` | String | `moneygestor_user` | Empty | MySQL account; nonblank required. No automatic root fallback. |
| `database.password` | String, secret | `CHANGE_ME_IN_PRODUCTION` | Empty | MySQL password; nonblank required. Replace the placeholder privately. |

The connection string is assembled with `MySqlConnectionStringBuilder`. The public options currently expose these connection fields only; there is no documented `database.sslMode`, pool-size or connection-string property in this schema. Configure database transport according to your installation rather than inventing unsupported settings.

Startup only validates schema version, reserved reference data and financial integrity. Missing or incompatible versions require manual initialization or export/import through the [administrative tool](database-migration-redesign.md). The API does not need DDL permissions and never updates the schema or seeds on startup. The former migration mode option is no longer supported.

## 6.3 Logging settings

| JSON field | Type | Example | Code default | Purpose and validation |
| --- | --- | --- | --- | --- |
| `log.level` | String | `Information` | Empty | Required minimum severity; accepted names listed below. Whitespace is trimmed. |
| `log.output.console` | Boolean | `true` | `false` | Enable console output. At least one console/file sink is required. |
| `log.output.file` | Object or null | Configured object | `null` | Enable file output; omit or set null to disable it. All file fields must be valid if present. |
| `log.output.file.path` | String | `./log/backend/` | Empty | Nonblank output directory; created by the logger and must be writable. Relative to process working directory. |
| `log.output.file.fileName` | String | `backend` | Empty | Nonblank base filename without invalid OS filename characters. Logger builds `backend_.log`, with rolling suffixes as applicable. |
| `log.output.file.rollingInterval` | Enum string | `Day` | `Day` | Case-insensitive Serilog interval: `Infinite`, `Year`, `Month`, `Day`, `Hour`, `Minute`. |
| `log.output.file.retainedFileCountLimit` | Integer | `14` | `14` | Positive maximum retained file count. This is a file count, not guaranteed days of history. |
| `log.output.file.fileSizeLimitBytes` | 64-bit integer | `104857600` | `104857600` | Positive per-file size limit in bytes; example is 100 MiB. |
| `log.output.file.rollOnFileSizeLimit` | Boolean | `true` | `true` | Roll to another file when the size limit is reached. If false, the sink can stop writing to that file until the next time roll. |
| `log.override` | Object: category → level | Two category overrides | Empty dictionary | Per-category minimum levels; keys must be nonblank, values valid Serilog levels. |
| `log.override.Microsoft.AspNetCore` | String | `Warning` | No override | Example HTTP/framework category override; the global level applies when absent. |
| `log.override.Microsoft.EntityFrameworkCore` | String | `Warning` | No override | Example EF category override; the global level applies when absent. |
| `log.diagnosticEfLogging` | Boolean | `false` | `false` | Opt-in EF SQL events, enabled only with Development and global Trace/Verbose. Does not enable SQL parameter values. |

`log.override` can contain other logging category names; the two example keys are not a closed allowlist.

Set `log.level` to `Debug` (or the `log__level=Debug` environment override) and restart the backend
to see descriptive request diagnostics. They include the absolute backend URL without its query
string, HTTP method/protocol, response status/duration, selected endpoint, authentication state
and content type. A category override for `webserver.RequestCorrelationMiddleware` can also set
its minimum level independently. Request/response bodies, credentials, cookies and query values
are excluded. At `Information`, only the normal request completion summary is emitted by the
application request loggers.

| `log.level` input, case-insensitive | Serilog level |
| --- | --- |
| `Critical` or `Fatal` | Fatal |
| `Error` | Error |
| `Warning` | Warning |
| `Information` | Information |
| `Debug` | Debug |
| `Trace` or `Verbose` | Verbose |

Override values use **Serilog names**: `Verbose`, `Debug`, `Information`, `Warning`, `Error`, `Fatal`. The `Trace` and `Critical` aliases accepted by the global level are not accepted as category override names.

Console-only configuration is supported:

```json
{
  "log": {
    "level": "Information",
    "output": { "console": true, "file": null },
    "override": {},
    "diagnosticEfLogging": false
  }
}
```

This is a **section example**, not a complete replacement settings file. In Compose, file logging should use `/app/log/backend` under the mounted writable directory.

## 6.4 Security / CORS settings

| JSON field | Type | Example | Code default | Purpose and validation |
| --- | --- | --- | --- | --- |
| `security.allowedOrigins` | Array of strings | `["http://localhost:3000"]` | Empty array | At least one absolute URI required. Used as the exact credentialed CORS allowlist. |
| `security.allowedOrigins[0]` | String | `http://localhost:3000` | Absent | First allowed frontend origin; additional array entries allow other explicit frontends. |
| `security.requireConfirmedEmail` | Boolean | `true` | `true` | Require email confirmation before login. Accepts `true` or `false`; invalid Boolean values fail configuration binding at startup. Applies to Identity and account services. |

Use origin values consisting of scheme, host and optional port, without page paths or a trailing slash. HTTP and HTTPS, different ports, and `localhost` versus `127.0.0.1` are different origins. Although validation checks absolute URIs, that alone does not prove a value is a usable browser origin.

CORS allows credentials, any method and any header for configured origins. A wildcard is not a substitute for explicit credentialed origins. CORS does not disable cookie SameSite/Secure rules, configure HTTPS or authenticate requests.

To allow login immediately after registration, set `security.requireConfirmedEmail` to `false`, or override it with `security__requireConfirmedEmail=false`, then restart the backend. Omitting the option preserves mandatory verification. This switch also allows existing unconfirmed accounts to log in and suppresses registration/resend confirmation emails. It does not mark email addresses as verified: enabling it again requires those accounts to confirm their email, using resend if needed.

The public GET `/api/v1/auth/configuration` returns `{ "requireConfirmedEmail": true }` (or `false`). Registration acceptance includes the same flag. The frontend uses the backend value to choose registration messages, show or hide confirmation resend, and adapt the verification page; no frontend environment switch is needed.

## 6.5 Email settings

| JSON field | Type | Example | Code default | Purpose and validation |
| --- | --- | --- | --- | --- |
| `email.host` | String or null | `smtp.example.com` | `null` | SMTP server. Together with a nonblank `from`, marks email as configured. |
| `email.port` | Integer | `587` | `587` | SMTP TCP port; 1–65535 when email is configured. |
| `email.username` | String or null | `CHANGE_ME` | `null` | SMTP authentication username. Credentials are assigned only when nonblank. |
| `email.password` | String or null, secret | `CHANGE_ME` | `null` | SMTP password when the server requires authenticated delivery. Not independently checked by startup validation. |
| `email.from` | String or null | `noreply@example.com` | `null` | Sender address; nonblank together with host to mark configured. Actual address validity/delivery is checked by mail handling/server. |
| `email.useSsl` | Boolean | `true` | `true` | Passed to `SmtpClient.EnableSsl`; use an endpoint supporting STARTTLS when enabled. |
| `email.frontendBaseUrl` | String | `http://localhost:3000` | Empty | Absolute frontend URL required when SMTP is configured. Used to construct confirmation and reset links. |

Production startup requires `email.IsConfigured` when `security.requireConfirmedEmail` is `true`, which means nonblank host **and** sender. With verification disabled, SMTP is optional for startup and registration, but still required for password recovery. Recovery can send reset links to unconfirmed accounts while verification is disabled. Configured SMTP is still validated in both modes. Startup does not test SMTP connectivity, credentials or delivery. Partial configuration can pass optional validation while delivery still fails. No message is printed containing account verification/reset tokens as an alternative to SMTP.

Links append `/verify-email` or `/reset-password` to the base URL. The server does not select a user's locale; a base URL without `/it` produces English links. Use the actual public HTTPS frontend address for hosted deployments.

## 6.6 Observability settings

| JSON field | Type | Example | Code default | Purpose and validation |
| --- | --- | --- | --- | --- |
| `observability.databaseReadinessTimeoutSeconds` | Integer | `2` | `2` | Timeout for readiness database operations; allowed range 1–30 seconds. |
| `observability.metricsEnabled` | Boolean | `true` | `true` | Whether to map the metrics endpoint. |
| `observability.metricsPath` | String | `/metrics` | `/metrics` | Nonblank path, at most 128 characters; begins with one `/`, not `//`; remaining characters are ASCII letters/digits, `/`, `-`, `_`. Cannot equal `/health/live` or `/health/ready`. |

Path validation applies even if metrics are disabled. Choose a route that does not collide with your API; validation explicitly reserves health paths but does not check every controller route. Metrics access should be restricted by the deployment network/proxy, because the mapped endpoint does not require an account cookie.

## 6.7 Environment variables outside the JSON schema

| Variable | Scope | Default / requirement | Meaning |
| --- | --- | --- | --- |
| `BACKEND_APP_SETTINGS` | Backend | `./settings.json` | Selects the required settings file; an absolute path is most predictable. |
| `ASPNETCORE_ENVIRONMENT` | Backend | ASP.NET Core host default; Compose sets `Production` | Affects Swagger, cookie security, SMTP/key requirements and EF diagnostics. |
| `ASPNETCORE_URLS` | Backend | Supplied by host/profile | Bind addresses when running locally, such as `http://localhost:5256`. |
| `ASPNETCORE_HTTP_PORTS` | Backend container | `8080` in Dockerfile | Container HTTP listening port. |
| `DATA_PROTECTION_KEYS_PATH` | Backend | Required in Production | Persistent writable protected key storage. Outside Production, fallback is `data-protection-keys` beside the binaries. |
| `MONEYGESTOR_ADMIN_CONNECTION_STRING` | Administrative CLI | Required for initialize/export/import/delete | Protected MySQL connection string. Its database must match `--database`; the CLI reads no settings file. Delete additionally requires confirmation and DROP permission. |
| `NEXT_PUBLIC_API_URL` | Frontend | Active clients fall back to `http://localhost:5256` | Browser-visible API URL; embedded at frontend build time. |

For example, these non-secret overrides take precedence over JSON during ordinary startup:

```powershell
$env:database__host = '127.0.0.1'
$env:observability__databaseReadinessTimeoutSeconds = '5'
$env:security__allowedOrigins__0 = 'http://localhost:3000'
```

An array override sets the specified index; it does not necessarily remove other JSON entries. Avoid accidentally retaining unwanted allowed origins. Supply secrets through protected deployment configuration rather than shell history or documentation.

## 6.8 Compose interpolation variables

These are consumed by [docker-compose.yml](../../docker-compose.yml), not by the backend settings classes.

| Variable | Default | Effect |
| --- | --- | --- |
| `BACKEND_IMAGE` | `moneygestor/backend:local` | Backend image name |
| `BACKEND_BIND_ADDRESS` | `127.0.0.1` | Host interface exposing the backend port |
| `BACKEND_PORT` | `5000` | Host backend port; also used in the frontend's API build argument |
| `FRONTEND_BIND_ADDRESS` | `127.0.0.1` | Host interface exposing the frontend port |
| `FRONTEND_PORT` | `3000` | Host frontend port |

The current Compose build argument constructs `NEXT_PUBLIC_API_URL` as `http://localhost:${BACKEND_PORT}`. Setting that variable only in a running frontend container cannot rewrite the already built bundle. Adjust build configuration for a public deployment and rebuild.

## 6.9 Configuration checklist

Before startup, check the selected file path, MySQL host/database/user, matching database schema version, at least one log sink, writable file-log storage, exact frontend origins, confirmation policy and email-link base URL. Production needs HTTPS topology and durable Data Protection storage; SMTP is required when confirmation is enabled and for email password recovery. Health/readiness validates MySQL availability; it does not validate email delivery or browser authentication.


---

| Previous | Documentation | Next |
| :--- | :---: | ---: |
| [← Frontend implementation](05-frontend.md) | [Index](README.md) | [API reference →](07-api-reference.md) |
