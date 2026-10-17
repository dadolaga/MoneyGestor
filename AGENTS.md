# AI instructions for MoneyGestor

This file is the entry point for Codex and other assistants working in this repository.
Read it before editing files and also apply the AGENTS.md in the relevant directory.

## Instruction map

- [Backend](backend/AGENTS.md): C#, ASP.NET Core, EF Core, APIs and databases.
- [Frontend](frontend/AGENTS.md): Next.js, React, UI, translations and build-only verification.
- [AI workflow and Codex usage](docs/AI_WORKFLOW.md): instruction loading, example requests and handoff.
- [Application documentation](backend/docs/README.md): current architecture, configuration and contracts.

Codex uses AGENTS.md files along the path from the project root to the working directory; local
instructions specialize the shared rules. When a task involves both backend and frontend, read both
files. Other assistants must read these references explicitly if they do not load them automatically.
The owner's latest explicit requests take precedence over project conventions.

## Authorization and scope

The owner authorizes changes needed for the requested task throughout the repository, without
requiring new approval for every source, dependency, configuration or documentation change.
This includes refactoring and local resources when their impact has been verified.

Preserve existing unrelated work. Do not expose secrets. Verify the target and impact before
destructive operations, database changes or work on external environments.
Do not commit, push, deploy or send external messages without a request authorizing those actions.

The default workstream remains the frontend: a UI request does not authorize changes to the backend,
API contracts or domain rules. Change these areas when the owner explicitly requests it.
Creating these guides does not open a new backend implementation phase.

## Before implementing

1. Run `git status --short` and identify existing changes.
2. Read local instructions and relevant documentation, then inspect the code actually involved.
3. Use `rg` to find reusable components, services and helpers before introducing new ones.
4. Define the requested behavior and make a complete, focused change.
5. Do not read, print or copy `settings.json`, including files in subdirectories; use
   [settings.example.json](settings.example.json) for the schema and synthetic values in examples.

Historical documents such as `docs/ARCHITECTURE.md`, `docs/PROJECT_AUDIT.md` and migration records
are absent from this checkout. If they become available, consult them in context; do not block work
or invent their contents. For now, use the available guides and inspect the current code.

## Implementation approach

- Keep implementations simple, clean and readable. Choose the least complex solution that fully
  satisfies the request while preserving correctness, security and maintainability.
- Follow the architecture, naming and style already used in the area being changed.
- Reuse existing boundaries: HTTP in the backend webserver, financial rules in logic,
  persistence in database, and presentation and UI state in the frontend.
- Do not add future features, abstractions or dependencies unless the request requires them.
- Use clear, intention-revealing names and focused functions or components. Prefer straightforward
  control flow over clever shortcuts, deeply nested conditions or unnecessary indirection.
- Reuse existing code when responsibilities match. Extract shared logic when it removes meaningful
  duplication; do not force unrelated cases into a generic abstraction.
- Keep each piece of state or business logic in one authoritative place. Derive values when practical
  instead of maintaining duplicate state that must be synchronized.
- Address the cause of an error in the affected flow. Do not hide failures with empty catch blocks,
  silent fallbacks or special cases that merely make the symptom disappear.
- Do not fix errors by removing type checks, validation, authorization or integrity constraints.
- Keep refactoring proportional to the task and confined to what the change needs. Remove code made
  obsolete by the change after checking its consumers; do not leave commented-out implementations.
- Write comments to explain non-obvious decisions, constraints or tradeoffs. Prefer clear code over
  comments that repeat what the code does.
- Write application and diagnostic log messages in English, regardless of the interface language.
- Update affected documentation when behavior or the status of a slice changes.
- Do not remove dependencies before searching for all consumers in the relevant area.

The current stack is .NET 10 in the backend and Next.js 15 / React 19 / TypeScript in the frontend.
Always check `global.json`, `.csproj` files and `frontend/package.json` before changing versions.
The `/api/v1` APIs are the only application endpoints and use Identity cookies, antiforgery and
Problem Details. Do not reintroduce non-versioned controllers, response envelopes or raw-token authentication.

## Verification and completion criteria

| Change | Default verification | When to stop |
| --- | --- | --- |
| Documentation only | Relative links, consistency and `git diff --check` | After these checks; no build |
| Frontend | `npm --prefix frontend run build` | After the full build exits with code 0 |
| Backend | `dotnet build backend/backend.sln` | After compilation; tests only when relevant and safe |
| Both areas, when requested | Frontend and backend builds | After both builds complete |

**Frontend: the build alone is sufficient.** Do not independently run test suites, Vitest,
Playwright, smoke tests, visual checks, or separate lint, typecheck or format checks. Do not start
`dev`, `start`, containers or servers to open and test a web page. This also applies to UI changes.
Keep checks built into `next build` enabled. Perform additional verification only when the owner
explicitly requests it; the presence of scripts or tests does not require running them.

Fix errors introduced by the change and rebuild only when necessary. If compilation is blocked by
a pre-existing or environmental problem, report it without claiming success or replacing the check
with an application launch. Do not automatically expand the task to resolve that problem.

## Handoff

Respond in Italian with a summary of the change and the verification actually performed.
Distinguish introduced errors, pre-existing issues and checks not run. A successful build verifies
compilation: do not claim that interactions or runtime behavior have been tested.
