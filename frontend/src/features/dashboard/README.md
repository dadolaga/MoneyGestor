# Dashboard

The live `/dashboard` route uses `Dashboard.tsx`, replacing the former category overview.
Its responsive layout follows the supplied dashboard reference and retains the shared application
header, navigation, theme tokens and English/Italian localization.

- `useDashboard.ts` loads the selected calendar month's overview and six most recent movements,
  with cancellation, loading/error states and retry. Wallets and categories load separately.
- `DashboardSummary.tsx` shows current wealth, monthly income, expenses and savings. Period totals,
  daily sparklines and previous-month comparisons use the existing transactions overview API.
- `DashboardMonthlyChart.tsx` shows daily income/expenses and selects the month for period data.
- `DashboardRecent.tsx` reuses movement display helpers and the shared table.
- Wealth distribution reuses `WealthDistribution` from wallets, including its signed-balance guard.
- Header and quick actions open the existing wallet/movement editors. Quick actions preselect income,
  expense or transfer; successful creation refreshes dashboard data. Financial validation stays in the API.

Wealth and distribution always reflect **current** wallet balances, independently of the selected
movement month. Wallets excluded from totals or without their own balance are excluded here too.
Transfers are excluded from income, expenses and savings. A previous total of zero or less does not
produce a percentage comparison. Empty/error states never substitute fixture amounts.

No backend changes are required for the implemented sections. The wealth history sparkline and
wealth percentage comparison in the reference need authoritative historical balance data that the
current APIs do not expose; they are omitted. Global search, notifications, budgets and reports
are not added by this dashboard change.

This folder contains only the live dashboard components and data hook. The former category-overview
preview, its models, adapter and fixtures have been removed; the development catalog retains wallet
and movement previews.
