**[Documentation](README.md) / Part III · Development and operations**

# 10 · Development and troubleshooting

> Build the project, run isolated tests and diagnose common issues.

<details>
<summary><strong>On this page</strong></summary>

- [10.1 Start a development task](#101-start-a-development-task)
- [10.2 Backend restore and build](#102-backend-restore-and-build)
- [10.3 Backend tests and database safety](#103-backend-tests-and-database-safety)
- [10.4 Frontend checks](#104-frontend-checks)
- [10.5 Generate OpenAPI without initializing MySQL](#105-generate-openapi-without-initializing-mysql)
- [10.6 Startup and configuration problems](#106-startup-and-configuration-problems)
- [10.7 Account and browser problems](#107-account-and-browser-problems)
- [10.8 Financial operation problems](#108-financial-operation-problems)
- [10.9 Keep documentation current](#109-keep-documentation-current)

</details>

---

## 10.1 Start a development task

Start with the [architecture](../../docs/all_modernization/ARCHITECTURE.md) and the relevant feature/design guides. Check `git status --short` before editing and keep changes focused. Repository collaboration conventions are defined in [AGENTS.md](../../AGENTS.md).

Use [settings.example.json](../../settings.example.json) as the configuration template. Keep local credentials, settings files and backup dumps out of commits. The supported SDK is defined in `global.json`; the versioned API uses Identity cookies, and integration tests use disposable MySQL containers.

## 10.2 Backend restore and build

```powershell
dotnet restore .\backend\backend.sln --locked-mode
dotnet build .\backend\backend.sln --no-restore
```

Use the SDK policy in [global.json](../../global.json). Central package versions and lock files must be updated coherently when dependencies change. Warnings are treated as errors; do not suppress them globally just to obtain a green build.

Shared C# style is in [backend/.editorconfig](../.editorconfig). Opening braces stay on the declaration/control-flow line. Formatting commands modify files, so inspect their diff and avoid unrelated changes:

```powershell
dotnet format style .\backend\backend.sln --no-restore --severity error
dotnet format whitespace .\backend\backend.sln --no-restore
```

## 10.3 Backend tests and database safety

Before running tests, inspect [TestDatabaseRuntime](../TestProject/Infrastructure/TestDatabaseRuntime.cs) and the [ownership guard](../TestProject/Infrastructure/TestDatabaseOwnershipGuard.cs). The current NUnit suite starts `mysql:8.4` through Testcontainers, with a random `mg_test_*` database, credentials and dynamically mapped port. It has no fallback to a shared local MySQL instance.

Docker must be working; the image may require a download. The suite intentionally creates and drops test schemas inside its owned environment. Do not reuse these cleanup mechanisms against an application database.

```powershell
dotnet test .\backend\TestProject\TestProject.csproj --no-restore
```

When switching branches or versions, verify the test infrastructure before running commands that create or remove schemas.

## 10.4 Frontend checks

```powershell
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run lint
npm --prefix .\frontend run test
npm --prefix .\frontend run build
```

Validate frontend changes with typecheck, lint and build. Run focused component/unit tests for changed behavior. Use `npm --prefix frontend ci` for reproducible lockfile installation.

For documentation changes, check relative links, configuration examples and consistency between guides, then run `git diff --check`.

## 10.5 Generate OpenAPI without initializing MySQL

Use the Testing environment and bypass launch profiles so Development settings do not override it:

```powershell
$previousEnvironment = $env:ASPNETCORE_ENVIRONMENT
try {
    $env:ASPNETCORE_ENVIRONMENT = 'Testing'
    dotnet run --project .\backend\webserver\webserver.csproj --no-launch-profile -- `
      --export-openapi docs/all_modernization/openapi
} finally {
    $env:ASPNETCORE_ENVIRONMENT = $previousEnvironment
}
```

The export branch starts a temporary local host and writes the specifications without calling normal database initialization. It is an artifact-generation command, not the normal API startup. Current export consumers can still expect older `docs/openapi` paths; coordinate any path changes with snapshot tests and [the API workflow](../../.github/workflows/api-contract.yml).

## 10.6 Startup and configuration problems

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| Settings file not found | Wrong working directory or profile override | Absolute `BACKEND_APP_SETTINGS`; selected launch profile; file existence |
| Database options invalid | Blank fields, zero/out-of-range port or bad enum | Public settings table and environment overrides |
| Startup refuses pending migrations | Default bootstrap is Disabled | Verify target; use a controlled migration window or fresh setup |
| Existing schema rejected | Database lacks current initial migration | Preserve old database; use a new empty schema or explicit conversion plan |
| Integrity preflight fails | Ownership, balance, pair or account-mapping inconsistency | Technical report, compatible backup and deliberate investigation; bootstrap mode is not a repair switch |
| Production rejects key path | Missing `DATA_PROTECTION_KEYS_PATH` | Persistent writable protected key storage |
| Production rejects email configuration | Missing SMTP host/sender | Configure SMTP plus a valid frontend URL |
| File logger cannot write | Bad path or filesystem permissions | Container path under `/app/log`; valid filename; non-root permissions |
| Readiness is Unhealthy | MySQL unreachable, credentials/privileges wrong or timeout | Container/host networking, database existence and configured timeout |
| Frontend container remains waiting | Backend health never succeeds | Backend startup logs and readiness first |

## 10.7 Account and browser problems

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| Generic login failure | Credentials wrong or email unconfirmed | Verify email, username/email input and lockout status |
| No confirmation/reset email | Placeholder SMTP, failed authentication, invalid sender or wrong link URL | SMTP delivery and `email.frontendBaseUrl`; acceptance is not delivery proof |
| Link expired/invalid | One-hour token lifetime, altered token or lost key ring | Request a new link; preserve Data Protection keys |
| Account locked / too many requests | Lockout or abuse limiter | Wait for the lockout/window; avoid repeated submits |
| CORS blocked | Frontend origin does not exactly match allowlist | Scheme, hostname and port; restart after editing settings |
| Cookie absent after login | Secure/SameSite policy, HTTPS topology or missing credentials | Production HTTPS, same-site arrangement and credentialed requests |
| API requests target the wrong host | Stale public build variable | Set browser-reachable `NEXT_PUBLIC_API_URL` and rebuild |
| 400 antiforgery error | Missing/stale token or mismatched cookie identity | Fetch a new token in the same cookie session; refresh browser app state after account transitions |
| 401 after password reset | Existing session was invalidated | Sign in again |
| Sessions/links break after redeploy | Key storage replaced or removed | Restore/preserve the key ring; do not remove named volumes routinely |

Keep hosts consistent during local testing: `localhost` and `127.0.0.1` are distinct for cookies/origins. Reports of failures should include status, stable error code and trace ID, without cookie/header dumps.

## 10.8 Financial operation problems

| Symptom | Explanation / action |
| --- | --- |
| Amount rejected | Use a nonzero transaction value with at most two decimal places and within the supported range. |
| Transfer rejected | Use positive magnitude, reserved Transfer type and two different wallets owned by the signed-in account. |
| Wallet deletion conflicts | Existing transactions include transfer sides; a zero balance does not mean no history. |
| Resource returns 404 | It may be absent or inaccessible to this account; the API intentionally does not distinguish these. |
| Dashboard differs from wallet totals | It aggregates dated transactions, excluding opening balances/transfers; type breakdowns are net signed values. |
| Preview changes do not persist | Design-system fixtures are separate from live `/api/v1` pages. |
| Mobile add page opens the regular form | That URL is currently a redirect; dedicated Quick Add remains planned. |

## 10.9 Keep documentation current

When adding or changing a settings property, update the example, options validation and [chapter 06](06-settings-reference.md) together. When changing an API, update DTOs, clients, generated specifications and [chapter 07](07-api-reference.md). When a UI slice changes state, update its migration/design records and relevant README.

Verify every relative link from the file containing it. Distinguish available features, development previews and planned work. Use synthetic values in examples and keep operational secrets out of the documentation.


---

| Previous | Documentation | Next |
| :--- | :---: | ---: |
| [← Operations and recovery](09-operations-and-recovery.md) | [Index](README.md) | [Back to the index →](README.md) |
