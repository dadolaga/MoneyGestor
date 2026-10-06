**[Documentation](README.md) / Part II · The implementation**

# 04 · Backend implementation

> Explore the API host, application services, security and startup pipeline.

<details>
<summary><strong>On this page</strong></summary>

- [4.1 Solution and projects](#41-solution-and-projects)
- [4.2 Request flow](#42-request-flow)
- [4.3 Application services and lifetimes](#43-application-services-and-lifetimes)
- [4.4 Startup sequence](#44-startup-sequence)
- [4.5 Authentication and authorization](#45-authentication-and-authorization)
- [4.6 Logging and operational endpoints](#46-logging-and-operational-endpoints)
- [4.7 API contracts and compatibility](#47-api-contracts-and-compatibility)

</details>

---

## 4.1 Solution and projects

The solution is [backend.sln](../backend.sln). Current projects target .NET 10; EF Core packages and other dependencies are centralized in [Directory.Packages.props](../Directory.Packages.props). Lock files support reproducible restore. Shared build policy lives in [Directory.Build.props](../Directory.Build.props), with warnings treated as errors.

| Project | Responsibility | Useful entry points |
| --- | --- | --- |
| `webserver` | ASP.NET Core host, HTTP controllers, Identity, options, health and observability | [Program.cs](../webserver/Program.cs), [Settings.cs](../webserver/Settings.cs) |
| `logic` | Financial commands, ownership, balance/transfer policies, validation and atomic execution | [ExecutorManager.cs](../logic/ExecutorManager.cs), [Security](../logic/Security) |
| `database` | MoneyGestor and Identity contexts, entities, schema migrations | [MoneyGestorContext.cs](../database/MoneyGestorContext.cs), [IdentityAccountContext.cs](../database/Identity/IdentityAccountContext.cs) |
| `TestProject` | NUnit domain, security, infrastructure, HTTP and integration tests | [test infrastructure](../TestProject/Infrastructure) |
| `ExportImportApplication` | Historical tool, disabled at its entry point | [Program.cs](../ExportImportApplication/Program.cs) |

## 4.2 Request flow

1. Correlation middleware assigns response trace and correlation IDs.
2. Request logging and metrics record operational metadata.
3. Exception handling maps failures to the appropriate v1 or legacy response.
4. Routing/CORS and antiforgery validation run. Every POST/PUT/PATCH/DELETE under `/api/v1` requires CSRF validation, including anonymous account operations.
5. Identity authenticates the cookie; authorization restricts protected endpoints.
6. A controller calls an account service, resource query service or command service.
7. Queries project owned EF entities to dedicated DTOs. Commands enforce financial rules and persist changes transactionally.

The principal's Identity account maps to an existing MoneyGestor user ID. Financial resource ownership is resolved server-side; resource DTOs do not let a client choose an owner.

## 4.3 Application services and lifetimes

`MoneyGestorContext`, `IdentityAccountContext`, account services and `ExecutorManager` are scoped. The DI container owns their lifetime. Commands in one request share the application context and explicit transaction; retry paths can obtain a fresh context through the registered factory.

[ResourceQueryService](../webserver/Api/V1/ResourceQueryService.cs) performs no-tracking reads with ownership predicates, filtering and pagination. [ResourceCommandService](../webserver/Api/V1/ResourceCommandService.cs) translates HTTP DTOs into existing application commands. Registration shares a MySQL transaction between application and Identity contexts.

`TimeProvider` centralizes operational time and can be replaced in tests. Cancellation flows from aborted HTTP requests into asynchronous services and EF operations.

## 4.4 Startup sequence

Normal startup loads and validates options, creates logging, registers services, builds the middleware pipeline and then initializes the database before serving requests.

Initialization applies or checks MoneyGestor migrations according to bootstrap mode, checks/applies Identity migrations, seeds global reference data, runs a read-only financial integrity preflight and creates legacy-to-Identity mappings. A failure stops startup; it does not automatically repair bad financial data.

In Production, an SMTP host/sender and `DATA_PROTECTION_KEYS_PATH` are required. `Testing` supplies in-memory host configuration for tests and OpenAPI export; it is not a production mode or a normal setup shortcut.

## 4.5 Authentication and authorization

| Mechanism | Current behavior |
| --- | --- |
| Identity session | Encrypted `MoneyGestor.Auth`, HttpOnly, SameSite=Lax, Secure in Production |
| Login lifetime | Explicit two-hour ticket, or persistent 30-day ticket with `remember=true`; sliding renewal enabled |
| Email confirmation | Required before successful login |
| Password policy | Minimum 12 characters, uppercase, lowercase, digit and non-alphanumeric character |
| Account tokens | One-hour lifetime for confirmation/reset tokens |
| CSRF | `MoneyGestor.Antiforgery` cookie plus `X-CSRF-TOKEN` header for v1 mutations |
| Lockout | Five failed password attempts, 15-minute lockout |
| Security stamp | Checked on each validation; password reset changes it and revokes existing tickets |
| Logout | Signs out the current browser cookie |
| Ownership | A missing or foreign resource is hidden behind the same 404 behavior |

Account operations additionally have process-local abuse limits per identity: login permits 20 attempts per 15-minute window; register/resend/forgot permit 5 per hour; confirm/reset permit 10 per hour. A separate per-IP counter allows four times the corresponding limit. Counters are tracked per operation with hashed keys in [AccountAbuseGuard](../webserver/Auth/AccountAbuseGuard.cs), not by a distributed rate-limit store.

Legacy PBKDF2 password hashes can be recognized and upgraded after successful authentication. The cookie bridge exists for temporary non-versioned endpoints; browser JavaScript does not need access to raw legacy authentication tokens. `/api/v1` accepts Identity cookies, not raw `Authorization` tokens.

## 4.6 Logging and operational endpoints

Serilog uses validated configuration for the minimum level, category overrides and sinks. The file sink supports time/size rotation and retention; sink errors are reported to stderr. EF diagnostic SQL logging requires Development, Trace/Verbose and the explicit diagnostic switch. SQL parameter values are not enabled.

`/health/live` checks the process without querying the database. `/health/ready` runs a bounded MySQL `SELECT 1`. Metrics are enabled by default at `/metrics` and can be disabled or moved. See [settings](06-settings-reference.md) and [operations](09-operations-and-recovery.md).

## 4.7 API contracts and compatibility

Current browser pages use versioned DTO-based `/api/v1` APIs. Success responses are resource objects, arrays, page objects or empty responses; errors use Problem Details with stable codes and trace IDs.

Legacy controllers retain their `{ code, message, data }` envelope and raw-token compatibility. Keep the contracts separate when integrating a client. Detailed endpoints and examples are in [chapter 07](07-api-reference.md).

The ZIP/CSV CLI exits with `feature_disabled` and exit code 2 before reading settings or touching the database. Its source files are historical artifacts, not an enabled import/export service. Use the administrative scripts described in [chapter 09](09-operations-and-recovery.md).


---

| Previous | Documentation | Next |
| :--- | :---: | ---: |
| [← Installation and startup](03-installation-and-startup.md) | [Index](README.md) | [Frontend implementation →](05-frontend.md) |
