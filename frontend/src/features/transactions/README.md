# Transactions

The live `/dashboard/transaction` route imports `TransactionsDashboard.tsx`. It composes the
page sections and coordinates the creation dialog and its in-memory draft.

| Files | Responsibility |
| --- | --- |
| `TransactionsHeader.tsx` | Page actions and CSV export of the complete filtered period |
| `TransactionSummary.tsx` | Income, expense, transfer and movement-count cards |
| `TransactionsFilters.tsx` | Search, date range, wallet, kind and category controls |
| `TransactionsList.tsx`, `TransactionsPagination.tsx` | Desktop table, mobile list, sorting and server-side pagination |
| `TransactionCategoriesCard.tsx`, `TransactionWeeklyCard.tsx` | Expense distribution and weekly income/expense charts |
| `TransactionsRecent.tsx` | Recent movements in the selected period |
| `TransactionActions.tsx`, `TransactionDisplay.tsx` | Shared row actions, category marks, wallet labels and amounts |
| `TransactionEditorDialog.tsx` | Shared form state, creation request, server errors and draft saving |
| `TransactionKindFields.tsx`, `TransactionDetailsFields.tsx`, `TransactionAdditionalFields.tsx` | Movement kind, required fields, notes, receipt selection and recurrence switch |
| `TransactionRecurrenceFields.tsx`, `transaction-editor-model.ts` | Recurrence controls, form types, defaults, validation and schedule preview |
| `useTransactionsDashboard.ts` | API loading, filters, pagination, sorting, cancellation and retry state |
| `transaction-kind.ts`, `transaction-analytics.ts`, `useTransactionFormatting.ts` | Shared classification, period totals and localized formatting |
| `TransactionsPreview.tsx`, `model.ts`, `adapter.ts` | Fixture-based development catalog and feature previews |

All editor sections share the same React Hook Form instance. Receipt selection and recurrence remain
previews saved only in the page draft; they cannot be submitted as ordinary movements. Editing and
deletion remain deferred. Transfers appear once and are excluded from income/expense totals.

The unused `transactions-page.tsx` implementation has been removed. The development preview and its
adapter remain because the catalog and fixture consumers still use them.

For ordinary frontend verification, follow [AGENTS.md](../../../AGENTS.md): run
`npm --prefix frontend run build` from the repository root, without separate tests or browser checks.
