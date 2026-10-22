# Transactions

The live /dashboard/transaction route imports TransactionsDashboard.tsx. It reuses the shared editor,
API client, row actions, confirmation dialog and display components for desktop and mobile.
Below 640px, the same editor opens full screen with two steps: essential fields, then a summary
and optional note. It slides in from the left and slides back to the left when dismissed.
Continue and More details slide the next step in from the left over 300ms; Back slides the first
step in from the right. Header and form animate together without remounting fields or losing values;
reduced motion disables these transitions.
Responsive CSS sets its full-screen position before the native modal opens, so the animation stays
horizontal rather than starting from the centered desktop position while the mobile hook initializes.
Wallets (including balances), all categories with search, and the date calendar open in native
bottom sheets and slide down on dismissal. Dragging their handle or header downward moves the sheet
with the pointer: releasing past a quarter of its height (capped at 96px) dismisses it; shorter or
cancelled gestures return it to its original position. The list/calendar keeps its normal scrolling.
The wallet/category sheet search field stays in a fixed footer below the options, so it remains
visible while the options scroll above it.
Shared searchable selects, including wallet/category filters, also show their search input and
choices in a bottom popup on mobile. Its position follows the visible viewport when the keyboard
opens, with search kept at the top of the scrollable list. Desktop retains its inline searchable dropdown.
Native modal contents remain mounted until the 300ms exit ends; reduced motion disables the animations.
On both mobile and desktop, dialog backdrops gradually fade their translucent white overlay and blur
in and out over 300ms, including the field sheets.
Initial focus goes
to the sheet title, leaving search fields unfocused until selected. Today/yesterday shortcuts select calendar dates; only the final Save
action writes to the API. Back preserves values, and financial field errors return to the first step.
Creation and editing share React Hook Form state, validation and the existing create/update requests;
desktop keeps its complete single-step dialog. After creating a movement on desktop, the dialog stays
open until dismissed manually, both here and on the dashboard. A successful creation clears amount,
description and notes while preserving the selected kind, date, wallets and category for the next entry.
Mobile creation and editing still close the dialog after a successful save.
On desktop, shared dialogs retain their content and native modal focus handling until the closing
fade/zoom finishes, reversing the opening animation with the same 300ms duration. Select and date popups open below their input,
reveal downward from its lower edge and retract gradually toward the input on dismissal, including
outside clicks and Escape. Native top-layer/display transitions retain the popup and its content
throughout the 300ms exit; constrained calendars scroll within the available space.
These animations respect reduced-motion preferences.
Shared notifications use a native top-layer popover above dialogs and sheets, including nested dialogs;
their container follows the active modal so notification controls remain interactive.
Category lists in the editor, filters and parent picker preserve the alphabetical order returned by
`GET /api/v1/transaction-types`. The backend orders by name using the database collation, then ID for ties.
Creating a category reloads metadata from the API to preserve this order. Category shortcuts reuse the first four categories
and keep a selected category visible. No separate merchant field is stored by the current API.
Calendar labels and selected-date text in the editor and date filters use the shared
`useCalendarDateFormatting` hook. It formats local calendar dates without inheriting the server's
time zone: converting local midnight to UTC could otherwise show the previous day or month in production.
Movement dates in desktop/mobile lists, recent movements and weekly chart ranges use the same
formatter through `useTransactionFormatting`. API dates (`YYYY-MM-DD`) remain calendar dates throughout
display; no time-zone conversion is applied and create/update payloads are unchanged.
The shared `Calendar` follows the active interface language for the first day of the week:
Monday in Italian and Sunday in English, for desktop, mobile and date-range filters.
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
| TransactionMobileFields.tsx | Mobile wallet/category pickers and date sheet using shared native sheets and calendar |
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
