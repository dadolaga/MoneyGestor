# Transactions

The live /dashboard/transaction route imports TransactionsDashboard.tsx. It reuses the shared editor,
API client, row actions, confirmation dialog and display components for desktop and mobile.
On wide desktop layouts, the list fills the remaining page height and only its rows scroll;
the title, column headings and pagination stay visible. Narrow layouts bound the list to 60dvh
while keeping normal page scrolling for the stacked summaries and charts.
The weekly chart fills its card's available height below the heading and legend, with a minimum plot height of 140px.
See the [backend specification and delivery status](../../../../backend/docs/transactions-dashboard/README.md)
and [API contracts](../../../../backend/docs/07-api-reference.md).

| Files | Responsibility |
| --- | --- |
| TransactionsHeader.tsx | Ordinary creation action and complete-period server CSV download |
| TransactionSummary.tsx | Overview totals, previous-period comparison and 12 daily-data miniatures |
| TransactionsFilters.tsx | Date/wallet/kind/category/search filters, shared with overview/recent/export |
| TransactionsList.tsx, TransactionsPagination.tsx | Server pagination and sorting, desktop/mobile presentation |
| TransactionCategoriesCard.tsx, TransactionWeeklyCard.tsx | Server expense distribution and seven-day blocks |
| TransactionsRecent.tsx | Latest four filtered movements, with the same row actions |
| TransactionActions.tsx, TransactionDisplay.tsx | Existing menu primitives, canonical category icons/colors and amounts |
| TransactionEditorDialog.tsx | Shared React Hook Form for creation/editing, API field errors |
| TransactionKindFields.tsx, TransactionDetailsFields.tsx, TransactionAdditionalFields.tsx | Kind, financial fields and notes (up to the existing API limit of 2000) |
| transaction-editor-model.ts | Shared form defaults and date validation |
| useTransactionsDashboard.ts | Metadata, paginated rows, overview, recent rows, cancellation and refresh |
| TransactionsPreview.tsx, model.ts, adapter.ts | Fixture development catalog, separate from the live flow |

Category creation persists name, parent, icon, color, description, keywords and report preference,
then reads the canonical DTO. Reserved types are identified by systemKind, never by their name.
The report preference does not remove movements from this dashboard. Transfer responses carry the
negative source value; the editor displays its magnitude and submits a positive transfer amount.

The recurrence switch is disabled and labelled "To be implemented". No schedule editor, recurrence
request, backend scheduler or recurrence persistence is provided. Receipts and drafts remain excluded.

After writes, rows, wallets, types, overview and recent rows are refreshed. The browser never loads
all movement pages for analytics or export. English/Italian dictionaries cover field errors, session
expiry, security failures, conflicts and domain errors without clearing entered form values.

For ordinary verification, follow [AGENTS.md](../../../AGENTS.md): run
npm --prefix frontend run build, without separate frontend tests, servers or browser checks.
