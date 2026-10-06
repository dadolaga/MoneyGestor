<p align="center">
  <img src="assets/documentation-banner.svg" alt="MoneyGestor — personal finance, clearly organized" width="100%">
</p>

<p align="center">
  <strong>Wallets · Income & expenses · Transfers · Financial overview</strong>
</p>

<p align="center">
  <a href="03-installation-and-startup.md">Get started</a> ·
  <a href="02-user-guide.md">User guide</a> ·
  <a href="06-settings-reference.md">Configuration</a> ·
  <a href="07-api-reference.md">API reference</a>
</p>

---

# MoneyGestor

MoneyGestor helps you organize personal finances in one place. Track balances across wallets, record income and expenses, transfer money between accounts, and review your finances over a selected period.

Built with **ASP.NET Core**, **Next.js** and **MySQL**, it combines a responsive web interface with an API that enforces account ownership and financial consistency.

> [!NOTE]
> MoneyGestor is under active development. The guides distinguish available features from planned work and legacy compatibility.

## Start here

| Explore the application | Run it locally | Build and integrate |
| :--- | :--- | :--- |
| Understand wallets, transactions and the dashboard. | Set up the database, configure the services and launch the app. | Explore the architecture, settings and API contracts. |
| [Application overview →](01-application-overview.md) | [Installation guide →](03-installation-and-startup.md) | [Backend →](04-backend.md) · [Frontend →](05-frontend.md) |

## Documentation

### Part I · The application

Learn what the application does, how to use it and how to set it up.

| Chapter | Guide | What you will find |
| :---: | :--- | :--- |
| **01** | [Application overview](01-application-overview.md) | Features, terminology, system structure and scope |
| **02** | [User guide](02-user-guide.md) | Accounts, wallets, income, expenses, transfers and dashboard |
| **03** | [Installation and startup](03-installation-and-startup.md) | Prerequisites, first database setup, local development and Docker |

### Part II · The implementation

Explore the codebase, configuration and financial rules.

| Chapter | Guide | What you will find |
| :---: | :--- | :--- |
| **04** | [Backend](04-backend.md) | Projects, services, request flow, security and startup |
| **05** | [Frontend](05-frontend.md) | Routes, components, API integration, translations and design |
| **06** | [Settings reference](06-settings-reference.md) | Configuration tables with types, defaults, validation and environment overrides |
| **07** | [API reference](07-api-reference.md) | Authentication, endpoints, payloads, queries and errors |
| **08** | [Database and business rules](08-database-and-business-rules.md) | Entities, ownership, balances, precision, transfers and migrations |

### Part III · Development and operations

Maintain the application, diagnose issues and recover data.

| Chapter | Guide | What you will find |
| :---: | :--- | :--- |
| **09** | [Operations and recovery](09-operations-and-recovery.md) | Deployment, health, logs, metrics, backup and staging restore |
| **10** | [Development and troubleshooting](10-development-and-troubleshooting.md) | Build commands, isolated tests and common problems |

## Technology at a glance

| Backend | Frontend | Data & operations |
| :--- | :--- | :--- |
| .NET 10 · ASP.NET Core | Next.js 15 · React 19 · TypeScript | MySQL 8.4 |
| EF Core · ASP.NET Core Identity | Tailwind CSS · shadcn/ui · Radix | Docker Compose |
| Serilog · NUnit | next-intl · Day.js · Vitest | Health checks · Prometheus metrics |

MUI remains in legacy frontend areas during migration. MySQL is managed separately from the application containers.

## Choose a reading path

| Your goal | Recommended chapters |
| :--- | :--- |
| Use the application | [Overview](01-application-overview.md) → [User guide](02-user-guide.md) |
| Set up a local instance | [Installation](03-installation-and-startup.md) → [Settings](06-settings-reference.md) → [User guide](02-user-guide.md) |
| Work on the backend | [Backend](04-backend.md) → [API](07-api-reference.md) → [Database](08-database-and-business-rules.md) |
| Work on the frontend | [Frontend](05-frontend.md) → [API](07-api-reference.md) → [Development](10-development-and-troubleshooting.md) |
| Operate an instance | [Settings](06-settings-reference.md) → [Database](08-database-and-business-rules.md) → [Operations](09-operations-and-recovery.md) |

> [!TIP]
> Terminal examples run from the repository root unless stated otherwise. Replace sample resource IDs and deployment values with those from your installation.

<details>
<summary><strong>Architecture, design and engineering records</strong></summary>

Implementation decisions and historical evidence are maintained in `docs/all_modernization`.

- [Architecture](../../docs/all_modernization/ARCHITECTURE.md)
- [Authentication](../../docs/all_modernization/AUTHENTICATION.md)
- [Frontend migration plan](../../docs/all_modernization/FRONTEND_MIGRATION_PLAN.md)
- [Visual design system](../../docs/all_modernization/UI_DESIGN_SYSTEM.md)
- [Internationalization](../../docs/all_modernization/INTERNATIONALIZATION.md)
- [Backend review](../../docs/all_modernization/BACKEND_REVIEW_2026-09-30.md)
- [Historical audit](../../docs/all_modernization/PROJECT_AUDIT.md)

Historical records describe the version and date they cover. Use the guides above for application usage and configuration.

</details>

---

**Ready to begin?** [Explore MoneyGestor →](01-application-overview.md)
