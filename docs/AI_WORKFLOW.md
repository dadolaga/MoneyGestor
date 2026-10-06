# Working with an AI assistant and Codex

## Which files to read

The repository uses the exact filename `AGENTS.md`, with a dot before the extension. Instructions
are versioned alongside the code so assistants can follow the same conventions for every task.

| File | Scope |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | Authorization, scope, working approach and shared verification |
| [backend/AGENTS.md](../backend/AGENTS.md) | C# architecture, APIs, domain, databases and compilation |
| [frontend/AGENTS.md](../frontend/AGENTS.md) | UI, routing, API clients, translations and build-only verification |

Codex collects instructions along the path to its working directory. Prefer starting a session
from the repository root and read a subdirectory's AGENTS.md before working there.
For tasks involving both areas, read both files. When starting from the root, subdirectory files
are not part of the initial scan: read them explicitly before changing those areas. Do not assume
linked documents are loaded automatically; open them when relevant.

Codex builds the instruction chain at startup; after changing instructions, start a new session
to reload them automatically. Within the same directory, `AGENTS.override.md` takes precedence over
`AGENTS.md`; do not create one to duplicate these guides. The default combined limit is 32 KiB.
Reference: [official OpenAI documentation on AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

For another assistant, explicitly ask it to read the shared guide and the guide for the relevant area.
There is no need to duplicate these instructions in product-specific files. If personal instructions
or overrides exist, check that they do not restore a broader frontend checklist without an explicit
request from the owner.

## AI workflow

1. Read the applicable instructions and inspect Git status without changing it.
2. Identify the actual files, routes and dependencies involved; look for reusable implementations.
3. Implement the requested behavior in the correct layer, preserving unrelated work.
4. Update translations, types and documentation needed for the change.
5. Perform only the verification required for that area.
6. Report the actual result and limitations, then stop when the completion criterion is satisfied.

Do not request approval for every change already covered by the task. Ask for information only when
an essential requirement is missing; continue independent work when possible.
Follow the shared guide's precautions for secrets, databases and external environments.

## Example requests

### Frontend

> Read AGENTS.md and frontend/AGENTS.md. Add the requested field to the wallet form using shared
> components and updating English and Italian. Preserve the API contract. Verify only with
> npm --prefix frontend run build and, if it succeeds, stop without tests or browser checks.

### Backend

> Read AGENTS.md and backend/AGENTS.md. This request opens backend work on the specified validation.
> Reuse domain policies, preserve ownership and atomicity, and update the API guide if the contract
> changes. Compile with dotnet build backend/backend.sln. Do not apply migrations to a real database
> or start tests before verifying their isolation.

### Documentation

> Update the AI instructions for the specified behavior, keeping frontend and backend guides
> consistent. Check links and git diff --check; do not build, run tests or start the application.

## What frontend verification means

For ordinary AI work, a full Next.js build with exit code 0 is sufficient. Keep internal build checks
enabled; do not add separate lint, typecheck, test or format checks.
Do not start servers or open web pages, even for style or layout changes.
An explicit request for tests or browser checks may extend verification for that task.

If the build fails, distinguish an introduced error from an environmental or pre-existing blocker.
Fix errors from the change and rebuild; do not bypass checks, launch the app as a substitute
or claim that runtime behavior has been verified.

An appropriate handoff is: “Change implemented. Frontend build completed successfully.
Tests and browser checks were not performed, as required by the instructions.” For documentation-only
changes, report link and diff checks instead. Do not claim success for commands that were not run.

## Maintaining the instructions

Keep shared rules at the root and area-specific rules in their respective AGENTS.md files. Also
update README checklists when verification policy changes. Do not include credentials, copies of
local settings or destructive commands presented as routine checks.
The owner's latest instructions take precedence over conventions in these files.
