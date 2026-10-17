# Portafogli

The live route uses [wallets-dashboard.tsx](wallets-dashboard.tsx), the shared
[wallet-editor-dialog.tsx](wallet-editor-dialog.tsx) and [wallet-api-adapter.ts](wallet-api-adapter.ts). Styles use
Tailwind and existing semantic tokens. Header and sidebar are unchanged.

## Component structure

`wallets-dashboard.tsx` owns API loading, selection, mutations and dialog state, and composes:

- [WalletsSummary.tsx](WalletsSummary.tsx): balance, wallet count and monthly totals.
- [WalletCardsList.tsx](WalletCardsList.tsx): selectable wallet cards.
- [WalletsTable.tsx](WalletsTable.tsx): wallet rows and selection/edit/delete callbacks.
- [WalletDetails.tsx](WalletDetails.tsx): selected wallet information and action callbacks.
- [WalletMovements.tsx](WalletMovements.tsx): recent movements and their loading/error/empty states.
- [WalletDistributions.tsx](WalletDistributions.tsx): wealth chart and breakdown by type.

Small section-specific components stay in their section's file. Shared wallet marks/status live in
[WalletDisplay.tsx](WalletDisplay.tsx), localized amounts and type labels in
[useWalletFormatting.ts](useWalletFormatting.ts), and dashboard types/colour conversion in
[wallet-dashboard-model.ts](wallet-dashboard-model.ts). Presentation components receive data and callbacks; they do not
fetch data or duplicate the page's state.

## Persistent API integration

- GET /api/v1/wallets loads wallets, balances, type and account/card metadata.
- GET /api/v1/dashboard supplies monthly income/expenses.
- GET /api/v1/transactions supplies the last five movements for the selected wallet. For debit cards it reads the linked
  account and labels that list accordingly.
- POST /api/v1/wallets creates a wallet; PUT /api/v1/wallets/{id} edits it; DELETE /api/v1/wallets/{id} deletes it after
  confirmation.
- Mutations use the shared cookie/antiforgery client. After success the list is fetched again. There are no temporary
  negative IDs, hidden server rows, page-only saves or local storage.
- The form stays open on errors, shows server field errors and preserves entered values. Known validation reasons are
  translated beside the affected field, including attempts to change the immutable wallet type. Pending requests disable
  form controls and prevent dismissal. Delete failures remain in the confirmation. If a mutation succeeds but refreshing
  fails, the editor closes and the page offers a retry; repeating the create request is not needed.

## Selection and presentation

No wallet is selected initially. Clicking a card or table name selects it; clicking the active card again or Clear
selection deselects it. Without a selection the table is shown; with a selection the detail replaces it. The
distributions stay alongside this content. Wallet cards keep a fixed width in a single horizontal row. The row scrolls
with native touch gestures or mouse dragging, with no automatic scrolling. Dragging does not select a wallet; clicking
or activating a card with the keyboard keeps the selection behaviour above. The page fills the shell's available height,
with the table/detail panel and distributions stretching together on desktop. Roomier table and detail rows, a larger
wealth chart and type bars improve readability. The chart legend stacks below the chart when its panel is narrow;
smaller screens keep the normal page scroll and horizontal table scroll so content remains accessible. While loading,
summary, table and distribution card frames are already present with empty data areas; the wallet row reserves one
non-interactive empty card. No balances, chart or empty-state messages are shown before the corresponding request
completes. Loading remains announced to assistive technology. Panel content fades in with a small upward motion. Wallet
cards enter from left to right when mounted, including newly added wallets, and lift slightly on mouse hover. Existing
cards do not replay their entrance when selection or data changes. All effects respect reduced-motion preferences. The
wealth doughnut draws its segments when data arrives and animates distribution updates. Type bars grow from left to
right on entry and transition to their new widths when balances change. Reduced-motion preferences also disable chart
and bar animations, including changes to that preference while the page is open. Styles live in
`src/styles/wallets.css`. After loading, the wallet row is empty when no wallets exist; the table shows the empty-state
message and distribution panels remain visible. Table actions are pencil/edit and trash/delete. Creation and editing
preserve the current selection. Delete clears a removed selection. The same editor preselects all persisted metadata,
including a colour outside the palette. On submit, the editor resolves the linked account from the validated form values
rather than a watched render snapshot. The account must still be present in the available current accounts. Opening
balances and wallet types are selected only on creation. During editing, the opening balance is read-only and the other
types are disabled; explanatory text describes both restrictions. Locked controls use the global darker backgrounds and
muted text from `src/app/globals.css`. The update contract does not accept opening balances and the backend rejects any
change of kind.

## Types and backend rules

| Type            | Independent balance | Linked account                 | Wealth total |
| --------------- | ------------------- | ------------------------------ | ------------ |
| Current account | Yes                 | No                             | Included     |
| Prepaid         | Yes                 | No                             | Included     |
| Debit           | No                  | Owned current account required | Excluded     |
| Credit          | No                  | Owned current account required | Excluded     |
| Cash            | Yes                 | No                             | Included     |

Name, colour and type are common. Icons follow the type. Non-cash types require an institution. Currency is EUR; debit
inherits currency/sharing from its account. IBAN is optional for current accounts and prepaid cards. Cards have network,
optional last four digits and optional expiry. Credit also records limit, current spending, statement closing day and
payment day. Notes are optional (200 characters). Shareable records a preference; it does not grant access to other
users. Only relevant fields are submitted. All type changes are rejected by the backend. Own balances, metadata and
inclusion flags come from the API; the frontend formats and displays them. Transactions/transfers currently select
balance-owning wallets. The backend also rejects direct balance changes for debit/credit cards. Credit spending is
stored metadata: billing automation and a card ledger are outside this CRUD change. Debit movements shown here belong to
the linked account, not to an independent card ledger.

The editor sends RGB colourValue; the backend reuses an available colour or creates a private colour inside the wallet
transaction. Existing colourId clients remain supported, without adding a colour API. Existing balance containers
migrate to type bank / EUR and retain their names, amounts and colours. See
[the API contract](../../../../backend/docs/07-api-reference.md).

Deletion is persistent and requires no movements and no linked cards. Foreign resources remain 404. The backend checks
these rules under wallet locks; the UI does not hide failures or remove rows optimistically.

## Deployment prerequisite

Apply migration 20261016164401_WalletDetails on a verified target before running the updated API. The migration and
model snapshot are included; no migration was applied to a database during this task. Normal startup may refuse a
pending migration under bootstrapMode Disabled. Do not bypass that check.

## Still deferred

- Connect account, transfer, add movement and view-all actions open the shared
  [ComingSoonDialog](../../components/shared/coming-soon-dialog.tsx). It shows a wrench icon, a Coming soon badge,
  localized explanatory text and one dismissal button. The reference's information panel, progress status, return button
  and interest link are omitted. These actions still do not perform account connections or movement operations.
- Available/book balance distinctions, bank sync status, last sync time, monthly balance comparisons and historical
  sparklines are unavailable; the UI does not fabricate them.
- Real bank connections, sharing permissions/invitations and automated credit billing are not implemented.
- Exact filled/coloured reference artwork and category-specific movement icons are unavailable. Existing Iconify bank,
  card, cash, pencil, trash and directional icons are reused.
- The older wallets-page.tsx and wallet-dialog.tsx remain isolated previews, not the live route. The preview dialog
  offers bank, savings, card and cash; investments are no longer selectable. Type, card subtype and colour buttons only
  change form values. Saving happens through the explicit submit action; Cancel and Save draft do not submit the wallet.
  Wallet/card types and opening balances are also locked while editing in this preview.
