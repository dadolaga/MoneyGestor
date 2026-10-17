# Portafogli

The live route uses [wallets-dashboard.tsx](wallets-dashboard.tsx), the shared
[wallet-editor-dialog.tsx](wallet-editor-dialog.tsx) and [wallet-api-adapter.ts](wallet-api-adapter.ts).
Styles use Tailwind and existing semantic tokens. Header and sidebar are unchanged.

## Persistent API integration

- GET /api/v1/wallets loads wallets, balances, type and account/card metadata.
- GET /api/v1/dashboard supplies monthly income/expenses.
- GET /api/v1/transactions supplies the last five movements for the selected wallet.
  For debit cards it reads the linked account and labels that list accordingly.
- POST /api/v1/wallets creates a wallet; PUT /api/v1/wallets/{id} edits it;
  DELETE /api/v1/wallets/{id} deletes it after confirmation.
- Mutations use the shared cookie/antiforgery client. After success the list is fetched again.
  There are no temporary negative IDs, hidden server rows, page-only saves or local storage.
- The form stays open on errors, shows server field errors and preserves entered values.
  Known validation reasons are translated beside the affected field; type-change restrictions
  appear only when the API explicitly returns that reason, not for every validation failure.
  Pending requests disable form controls and prevent dismissal. Delete failures remain in the confirmation.
  If a mutation succeeds but refreshing fails, the editor closes and the page offers a retry;
  repeating the create request is not needed.

## Selection and presentation

No wallet is selected initially. Clicking a card or table name selects it; clicking the active
card again or Clear selection deselects it. Without a selection the table is shown; with a
selection the detail replaces it. The distributions stay alongside this content.
The card section is empty when no wallets exist. Table actions are pencil/edit and trash/delete.
Creation and editing preserve the current selection. Delete clears a removed selection.
The same editor preselects all persisted metadata, including a colour outside the palette.
Initial balances are read-only when editing: the existing update contract does not change opening balances.

## Types and backend rules

| Type | Independent balance | Linked account | Wealth total |
| --- | --- | --- | --- |
| Current account | Yes | No | Included |
| Prepaid | Yes | No | Included |
| Debit | No | Owned current account required | Excluded |
| Credit | No | Owned current account required | Excluded |
| Cash | Yes | No | Included |

Name, colour and type are common. Icons follow the type. Non-cash types require an institution.
Currency is EUR; debit inherits currency/sharing from its account. IBAN is optional for current
accounts and prepaid cards. Cards have network, optional last four digits and optional expiry.
Credit also records limit, current spending, statement closing day and payment day.
Notes are optional (200 characters). Shareable records a preference; it does not grant access to other users.
Only relevant fields are submitted. Incompatible type changes are rejected by the backend.
Own balances, metadata and inclusion flags come from the API; the frontend formats and displays them.
Transactions/transfers currently select balance-owning wallets. The backend also rejects direct balance
changes for debit/credit cards. Credit spending is stored metadata: billing automation and a card ledger
are outside this CRUD change. Debit movements shown here belong to the linked account, not to an
independent card ledger.

The editor sends RGB colourValue; the backend reuses an available colour or creates a private colour
inside the wallet transaction. Existing colourId clients remain supported, without adding a colour API.
Existing balance containers migrate to type bank / EUR and retain their names, amounts and colours.
See [the API contract](../../../../backend/docs/07-api-reference.md).

Deletion is persistent and requires no movements and no linked cards. Foreign resources remain 404.
The backend checks these rules under wallet locks; the UI does not hide failures or remove rows optimistically.

## Deployment prerequisite

Apply migration 20261016164401_WalletDetails on a verified target before running the updated API.
The migration and model snapshot are included; no migration was applied to a database during this task.
Normal startup may refuse a pending migration under bootstrapMode Disabled. Do not bypass that check.

## Still deferred

- Connect account, transfer, add movement and view-all dialogs remain empty.
- Available/book balance distinctions, bank sync status, last sync time, monthly balance comparisons
  and historical sparklines are unavailable; the UI does not fabricate them.
- Real bank connections, sharing permissions/invitations and automated credit billing are not implemented.
- Exact filled/coloured reference artwork and category-specific movement icons are unavailable.
  Existing Iconify bank, card, cash, pencil, trash and directional icons are reused.
- The older wallets-page.tsx and wallet-dialog.tsx remain isolated previews, not the live route.
