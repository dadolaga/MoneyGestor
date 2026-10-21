# Dashboard

The live `/dashboard` route uses `Dashboard.tsx`, replacing the former category overview.
Its responsive layout follows the supplied dashboard reference and retains the shared application
header, navigation, theme tokens and English/Italian localization.

On phones, the same dashboard prioritizes a full-width current balance, three compact monthly
totals, a prominent New movement action and recent movements before charts and distribution.
The selected month is labelled above the summary and can still be changed in the monthly chart.
Recent movements reuse the existing table and display helpers, hiding secondary columns and showing
the date and wallet under the description on phones. Desktop retains its existing layout.
The shared shell adds Home / Movements / More navigation below the desktop breakpoint; More opens
the existing navigation sheet, and content reserves space for the bar and the device safe area.

`DashboardQuickActions.tsx` reuses the shared movement editor. On phones it offers shortcuts for
the first four available non-system categories in the API's alphabetical order, using their existing names, icons and
colors, and preselects the category for a new expense. The main action opens the shared editor with
all categories and movement kinds: below 640px it uses the two-step full-screen mobile layout
and top sheets documented in the [transactions guide](../transactions/README.md).
With no categories, income/expense/transfer shortcuts remain
available; loading and metadata errors still use the shared editor's states. Add wallet remains
available through the existing wallet editor. There is no separate mobile route or financial logic.
Creating a category reloads metadata from the API so shortcuts keep the server's alphabetical order.

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
