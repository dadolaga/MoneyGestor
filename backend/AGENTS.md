# AI instructions for the backend

These instructions apply to `backend/` and supplement the [shared AGENTS.md](../AGENTS.md).
Modify the backend only when the request explicitly concerns this area.

## Before working

Read the relevant guides:

- [Backend architecture](docs/04-backend.md).
- [API contract](docs/07-api-reference.md).
- [Database and financial rules](docs/08-database-and-business-rules.md).
- [Development and troubleshooting](docs/10-development-and-troubleshooting.md).
- [Configuration](docs/06-settings-reference.md), when affected by the request.

The current stack is .NET 10, ASP.NET Core, EF Core and MySQL. The SDK and dependencies are defined
in [global.json](../global.json), [Directory.Packages.props](Directory.Packages.props) and lockfiles.
Do not apply historical .NET 8 guidance to the current code.

## Where to implement

| Area | Responsibility |
| --- | --- |
| `webserver/Controllers` | HTTP binding, authentication, authorization and responses |
| `webserver/Api/V1` | DTOs and query services for versioned resources |
| `webserver/Auth` | Accounts, Identity sessions and authenticated owner resolution |
| `logic/Commands` and `logic/Security` | Financial rules, ownership and atomic changes |
| `database` | EF entities, DbContext and migrations |
| `TestProject` | NUnit tests and isolated infrastructure |
| `ExportImportApplication` | Disabled historical CLI; do not incidentally re-enable it |

`ApplicationIdentityUser` is the single user entity and uses a numeric Identity key. Its `Id` is
also the financial owner key. `MoneyGestorContext` includes Identity and financial entities; do not
reintroduce a separate user table, account mapping or Identity context. Registration uses
`UserManager.CreateAsync` once. The current initial migration targets a new empty database.

Keep controllers small. Reads call query services; writes call `ExecutorManager.ExecuteAsync(ownerId,
command, cancellationToken)` directly and receive the result. Extend commands and shared policies
without duplicating domain logic in endpoints or the frontend. Commands can call child commands
directly within `logic`, using the active executor and cancellation token; only the outer execution
owns the transaction and retries. Keep command inputs replayable and external side effects outside
retryable writes. Use DI; the executor owns factory-created contexts, while the container owns scoped
query/account contexts. Do not introduce static DbContext instances.

For reads, preserve ownership filters, DTO projections, pagination and `AsNoTracking` where
appropriate. Propagate `CancellationToken` through asynchronous operations. Use `TimeProvider`
for operational time instead of introducing clock reads that are difficult to control.

## Constraints to preserve

- Resolve ownership from the authenticated principal, never from an arbitrary client-supplied owner.
- Do not reveal other users' resources: retain 404 behavior for missing or foreign resources.
- Use `decimal` and existing monetary policies; do not introduce `double`, implicit rounding
  or direct balance updates that bypass commands.
- Preserve transfer atomicity, reciprocal pairs, balance effects and concurrency handling.
  Reuse existing policies, locks and retries.
- Keep financial dates as calendar dates (`DateOnly`); operational time remains UTC.
- For `/api/v1`, retain Identity cookies, CSRF for mutations, DTOs and Problem Details errors.
  Do not introduce tokens in JavaScript or restore legacy endpoints/authentication.
- Do not log passwords, tokens, cookies, connection strings or sensitive SQL parameters.
- For new options, update the example schema, validation and configuration guide together.
- For contract changes, update DTOs, documentation and required consumers. `/api/v1` is the only
  application contract.

## Databases, migrations and tools

The build does not require starting MySQL. Do not launch the backend merely to check compilation:
startup may apply migrations or perform initialization.

Do not read `settings.json` files. Do not apply migrations, seeds, repairs, restores or cleanup scripts
to a database without verifying the target and the task's authorization. A model change may require
a matching migration, but does not authorize applying it to a real environment.
Operational resources and scripts in `ops/` require the same precautions.

## Style and dependencies

Follow [.editorconfig](.editorconfig) and nearby file conventions for namespaces, naming, nullability,
braces and C# types. Do not indiscriminately format the entire solution.
Update centralized versions and lockfiles together when changing a dependency.
Keep [TreatWarningsAsErrors](Directory.Build.props) enabled; do not disable it to obtain a green build.

## Verification

From the repository root:

```powershell
dotnet build backend/backend.sln
```

Fix introduced errors and stop after compilation unless the request requires more.
Do not automatically start the application, Docker or the entire test suite.

If relevant backend tests are needed, first read
[TestDatabaseRuntime](TestProject/Infrastructure/TestDatabaseRuntime.cs) and
[TestDatabaseOwnershipGuard](TestProject/Infrastructure/TestDatabaseOwnershipGuard.cs).
The current infrastructure uses Testcontainers MySQL 8.4 with a random `mg_test_*` database and
a dynamic port: it creates and removes its own resources. Do not assume that a suite from another
revision has the same target or replace the isolated environment with a shared database.
Run only necessary tests after verifying isolation and environment availability.

For documentation-only changes, check links and `git diff --check`: no build or tests.
In the handoff, distinguish compilation, any tests run, pre-existing errors and checks not performed.
