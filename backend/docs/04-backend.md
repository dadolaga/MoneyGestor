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
| `database` | Unified financial/Identity context, entities and explicit schema version | [MoneyGestorContext.cs](../database/MoneyGestorContext.cs), [DatabaseSchema.cs](../database/DatabaseSchema.cs) |
| `TestProject` | NUnit domain, security, infrastructure, HTTP and integration tests | [test infrastructure](../TestProject/Infrastructure) |
| `ExportImportApplication` | Manual initialization, versioned ZIP/CSV export/import and confirmed database deletion | [Program.cs](../ExportImportApplication/Program.cs), [DatabaseTransfer.cs](../ExportImportApplication/DatabaseTransfer.cs) |
| `DatabaseTransferTests` | Focused archive tests and isolated MySQL round-trip tests | [tests](../DatabaseTransferTests) |

## 4.2 Request flow

1. Correlation middleware assigns response trace and correlation IDs.
2. Request logging and metrics record operational metadata.
3. Exception handling maps failures to Problem Details.
4. Routing and CORS run.
5. Identity authenticates the cookie; authorization restricts protected endpoints.
6. Antiforgery validates against the resolved identity. Every POST/PUT/PATCH/DELETE under `/api/v1` requires CSRF validation, including anonymous account operations.
7. A controller calls the account service, the resource query service or `ExecutorManager.ExecuteAsync(ownerId, command, cancellationToken)`.
8. Queries project owned EF entities to dedicated DTOs. Commands enforce financial rules and persist changes transactionally.

`ApplicationIdentityUser` is the only user entity. Its numeric Identity key is also the owner key of financial resources. Ownership is resolved from the authenticated principal; resource DTOs do not let a client choose an owner.

## 4.3 Application services and lifetimes

Account services, query contexts and `ExecutorManager` are scoped. The DI container owns their lifetime. The executor creates and disposes a fresh application context and explicit transaction for each execution attempt through `IDbContextFactory<MoneyGestorContext>`. Failed concurrent writes retry the complete operation up to five attempts; subsequent operations on the same executor also start with a fresh context.

[ResourceQueryService](../webserver/Api/V1/ResourceQueryService.cs) performs no-tracking reads with ownership predicates, filtering and pagination. Controllers translate HTTP DTOs into commands and receive the result directly from the executor. There is no forwarding command service or mutable `command.Result`.

Commands return `Task<T>` from `ExecuteAsync`. Within `logic`, a parent can call `await child.ExecuteAsync(executorManager, cancellationToken)` directly: both use the active owner, context and transaction. Only the outer executor commits or rolls back. Do not re-enter `ExecutorManager.ExecuteAsync` from a command or swallow child failures; retries must repeat the whole operation. Commands must keep inputs replayable and avoid external side effects inside database retries.

[ApiCurrentUser](../webserver/Auth/ApiCurrentUser.cs) reads and validates the numeric ID from the authenticated Identity principal without a mapping query; command constructors do not accept a replacement owner. Registration creates one `ApplicationIdentityUser` through `UserManager.CreateAsync`, including name and surname. Identity and financial data use the same `MoneyGestorContext`, with no second user record or cross-context transaction.

`TimeProvider` centralizes operational time and can be replaced in tests. Cancellation flows from aborted HTTP requests into asynchronous services and EF operations.

## 4.4 Startup sequence

Normal startup loads and validates options, creates logging, registers services, builds the middleware pipeline and then validates the database before serving requests.

Validation reads `database_metadata` and requires the schema version compiled into this release, validates reserved global reference data and runs a read-only financial integrity preflight. A failure stops startup and requests manual intervention. Startup never creates tables, applies migrations, seeds or repairs data. The separate administrative tool initializes an existing empty database or imports a supported versioned archive into one; see the [manual update workflow](database-migration-redesign.md).

In Production, `DATA_PROTECTION_KEYS_PATH` is required, and an SMTP host/sender is required when email confirmation is enabled. SMTP remains necessary for password recovery in either mode. `Testing` supplies in-memory host configuration for tests and OpenAPI export; it is not a production mode or a normal setup shortcut.

## 4.5 Authentication and authorization

| Mechanism | Current behavior |
| --- | --- |
| Identity session | Encrypted `MoneyGestor.Auth`, HttpOnly, SameSite=Lax, Secure in Production |
| Login lifetime | Explicit two-hour ticket, or persistent 30-day ticket with `remember=true`; sliding renewal enabled |
| Email confirmation | Required by default; configurable with `security.requireConfirmedEmail`, exposed by `/api/v1/auth/configuration` |
| Password policy | Minimum 12 characters, uppercase, lowercase, digit and non-alphanumeric character |
| Account tokens | One-hour lifetime for confirmation/reset tokens |
| CSRF | `MoneyGestor.Antiforgery` cookie plus `X-CSRF-TOKEN` header for v1 mutations |
| Lockout | Five failed password attempts, 15-minute lockout |
| Security stamp | Checked on each validation; password reset changes it and revokes existing tickets |
| Logout | Signs out the current browser cookie |
| Ownership | A missing or foreign resource is hidden behind the same 404 behavior |

Account operations additionally have process-local abuse limits per identity: login permits 20 attempts per 15-minute window; register/resend/forgot permit 5 per hour; confirm/reset permit 10 per hour. A separate per-IP counter allows four times the corresponding limit. Counters are tracked per operation with hashed keys in [AccountAbuseGuard](../webserver/Auth/AccountAbuseGuard.cs), not by a distributed rate-limit store.

Identity is the only authentication mechanism. Users and roles use `UInt64` keys. The `AspNetUsers` row contains profile data, normalized username/email, password hash and security state. There are no separate `user`/`login` tables, ownership mapping fields, raw authentication tokens, cookie bridges or historical password verification.

Cookie validation rejects and clears sessions whose user ID is missing, zero or incompatible with `UInt64`, including GUID-based sessions from earlier versions, before querying the Identity store. Valid numeric sessions still undergo the standard security-stamp validation.

## 4.6 Logging and operational endpoints

Serilog uses validated configuration for the minimum level, category overrides and sinks. The file sink supports time/size rotation and retention; sink errors are reported to stderr. EF diagnostic SQL logging requires Development, Trace/Verbose and the explicit diagnostic switch. SQL parameter values are not enabled.

Console and file events retain the original single-line format: timestamp, level, trace ID,
correlation ID and message. Application and diagnostic log messages use descriptive English sentences,
independently of the interface language.
At Information, each completed request reports method, path, status and duration. At Debug,
request diagnostics also report the incoming absolute URL and protocol, followed by the response
status, duration, selected endpoint, anonymous/authenticated state and response content type.
Client cancellation and unhandled failures have distinct Debug messages and are still propagated.
URL logging excludes query strings; request bodies, cookies, authentication headers and account
names are not logged. These URLs describe requests received by the backend; frontend pages served
by Next.js are not automatically visible to it. Framework messages keep their original wording.

`/health/live` checks the process without querying the database. `/health/ready` runs a bounded MySQL `SELECT 1`. Metrics are enabled by default at `/metrics` and can be disabled or moved. See [settings](06-settings-reference.md) and [operations](09-operations-and-recovery.md).

## 4.7 API contracts and compatibility

Current browser pages use versioned DTO-based `/api/v1` APIs. Success responses are resource objects, arrays, page objects or empty responses; errors use Problem Details with stable codes and trace IDs.

Only `/api/v1` resource and account endpoints are available. Non-versioned controllers, the `{ code, message, data }` envelope and compatibility mappers have been removed. The URL version is retained as a stable public contract. Detailed endpoints and examples are in [chapter 07](07-api-reference.md).

The ZIP/CSV CLI provides `initialize`, `export`, `import` and `delete`, using an explicit database name and `MONEYGESTOR_ADMIN_CONNECTION_STRING`; it never reads application settings. Deletion requires typing the exact database name and removes the entire database. The old importer and EF migration chain have been removed. SQL backup/recovery scripts remain separate tools for recovery on a compatible schema; see [chapter 09](09-operations-and-recovery.md).


---

| Previous | Documentation | Next |
| :--- | :---: | ---: |
| [← Installation and startup](03-installation-and-startup.md) | [Index](README.md) | [Frontend implementation →](05-frontend.md) |
