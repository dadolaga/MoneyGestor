**[Documentation](README.md) / Part II · The implementation**

# 07 · API reference

> Integrate with the versioned API using cookie sessions, resource DTOs and structured errors.

<details>
<summary><strong>On this page</strong></summary>

- [7.1 Choose the correct contract](#71-choose-the-correct-contract)
- [7.2 Cookie and CSRF sequence](#72-cookie-and-csrf-sequence)
- [7.3 Account endpoints](#73-account-endpoints)
- [7.4 Financial resource endpoints](#74-financial-resource-endpoints)
- [7.5 Resource payload examples](#75-resource-payload-examples)
- [7.6 Transaction queries and pagination](#76-transaction-queries-and-pagination)
- [7.7 Errors and correlation](#77-errors-and-correlation)
- [7.8 Removed endpoints](#78-removed-endpoints)

</details>

---

## 7.1 Choose the correct contract

`/api/v1` is the only application API. It returns dedicated DTOs and HTTP statuses, uses Identity cookies and requires CSRF validation on mutations. Non-versioned compatibility endpoints and raw authentication tokens have been removed.

The generated specification is [v1.json](../../docs/openapi/v1.json). Regenerate it when changing API contracts. Runtime Swagger is exposed in Development and Testing, not Production.

Local base URLs are `http://localhost:5256` for development and `http://localhost:5000` for default Compose port exposure. Hosted clients must use the deployment's public API URL.

## 7.2 Cookie and CSRF sequence

1. GET `/api/v1/auth/antiforgery` and retain its cookies and returned `token`.
2. POST the account action with those cookies and `X-CSRF-TOKEN: <token>`.
3. After successful login, retain `MoneyGestor.Auth`; obtain a fresh CSRF token for the authenticated identity.
4. Send the session cookies on protected reads and cookies plus the CSRF header on subsequent mutations.

CSRF applies even to anonymous POST actions such as registration and login. An authentication token in `Authorization` does not replace the cookie for v1. A browser client must send credentials and satisfy the configured CORS and cookie rules.

This development PowerShell example signs in to an existing confirmed account without hard-coding a password:

```powershell
$apiBase = 'http://localhost:5256'
$apiSession = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$csrf = Invoke-RestMethod "$apiBase/api/v1/auth/antiforgery" -WebSession $apiSession
$credential = Get-Credential -Message 'Confirmed MoneyGestor development account'
$loginBody = @{
    user = $credential.UserName
    password = $credential.GetNetworkCredential().Password
    remember = $false
} | ConvertTo-Json
Invoke-RestMethod "$apiBase/api/v1/auth/login" -Method Post `
    -WebSession $apiSession -ContentType 'application/json' `
    -Headers @{ 'X-CSRF-TOKEN' = $csrf.token } -Body $loginBody
$csrf = Invoke-RestMethod "$apiBase/api/v1/auth/antiforgery" -WebSession $apiSession
Invoke-RestMethod "$apiBase/api/v1/auth/session" -WebSession $apiSession
Remove-Variable loginBody, credential
```

Do not print the login body, cookies or CSRF/email tokens. For mutations, use the refreshed `$csrf.token` and the same web session. Browser HttpOnly restrictions apply to JavaScript; a non-browser client manages its own cookie jar.

## 7.3 Account endpoints

All paths in this table start with `/api/v1/auth`.

| Method and suffix | Session required | JSON body / purpose | Success |
| --- | --- | --- | --- |
| GET `/configuration` | No | Read the backend email-confirmation policy | 200 `{ "requireConfirmedEmail": true }` (or `false`); `Cache-Control: no-store` |
| GET `/antiforgery` | No | Issue request token and antiforgery cookie | 200 `{ "token": "..." }` |
| POST `/register` | No | `firstname`, `lastname`, `username`, `email`, `password` | 202 generic acceptance with `message` and `requireConfirmedEmail` |
| POST `/login` | No | `user`, `password`, optional `remember` | 204; session cookie issued |
| GET `/session` | Yes | Current minimal profile | 200 profile |
| POST `/logout` | Yes | Sign out current cookie | 204 |
| POST `/confirm-email` | No | `userId`, `token` | 204 |
| POST `/resend-confirmation` | No | `email` | 202 generic acceptance |
| POST `/forgot-password` | No | `email` | 202 generic acceptance |
| POST `/reset-password` | No | `email`, `token`, `password` | 204 |

Profile fields are `id`, `firstname`, `lastname`, `email`, `username`. Generic account acceptance prevents enumeration and is not a mail-delivery receipt. Password and lockout rules are in [chapter 04](04-backend.md).

The profile `id` is the numeric Identity primary key, also used for financial ownership. A confirmation link carries that same ID as decimal text in `userId`; the confirmation JSON request keeps `userId` as a string. Invalid or out-of-range IDs return the generic `invalid_token` response. Existing frontend payloads and profile field names are unchanged.

The confirmation policy is configured by `security.requireConfirmedEmail` (default `true`). Clients should fetch `/configuration` before offering confirmation-related actions and use the flag in the registration response for the success message. Registration returns the same acceptance shape for existing and newly created accounts; the flag describes server policy, not account existence.

When the flag is `false`, registration does not send a confirmation email, login accepts unconfirmed accounts, and `/resend-confirmation` returns generic 202 acceptance without sending mail. Password recovery accepts unconfirmed accounts in this mode but still requires SMTP. The `/confirm-email` token contract remains available for valid previously issued links. Disabling verification does not change stored confirmation status, so re-enabling it requires those accounts to verify before login.

## 7.4 Financial resource endpoints

All endpoints below require a session. Mutations also require CSRF.

| Method | Path | Purpose / success |
| --- | --- | --- |
| GET | `/api/v1/colors` | 200 array of available global/private colors |
| GET | `/api/v1/wallets` | 200 wallet array |
| POST | `/api/v1/wallets` | 201 `{ "id": ... }` and Location |
| GET | `/api/v1/wallets/{id}` | 200 wallet detail |
| PUT | `/api/v1/wallets/{id}` | Update name/color and optional account/card details; 204 |
| DELETE | `/api/v1/wallets/{id}` | Delete wallet without transactions or linked cards; 204 |
| PUT | `/api/v1/wallets/{id}/favorite` | Set favorite using bare JSON `true` or `false`; 204 |
| GET | `/api/v1/transaction-types` | 200 available type array |
| GET | `/api/v1/transaction-types/{id}` | 200 type detail |
| POST | `/api/v1/transaction-types` | Create a private category with optional metadata; 201 ID and Location |
| GET | `/api/v1/transactions` | 200 paginated transaction DTOs |
| GET | `/api/v1/transactions/overview` | Complete-period aggregates, comparison and chart series |
| GET | `/api/v1/transactions/export` | Stream the complete filtered period as CSV |
| GET | `/api/v1/transactions/{id}` | 200 transaction detail |
| POST | `/api/v1/transactions` | 201 ID and Location |
| PATCH | `/api/v1/transactions/{id}` | Partial update; 204 |
| DELETE | `/api/v1/transactions/{id}` | Delete transaction or transfer pair; 204 |
| GET | `/api/v1/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD` | 200 period totals and type breakdowns |

There are no v1 color mutation endpoints or transaction-type update/delete endpoints in the current controllers.

## 7.5 Resource payload examples

IDs below are illustrative. Fetch available colors/types/wallets and use real IDs belonging to the current account; type ID 3 or wallet ID 10 is not guaranteed to exist.

Create a wallet:

```json
{ "name": "Current account", "initialValue": 1000.00, "colorId": 1 }
```

Update name/color without changing the opening balance:

```json
{ "name": "Main account", "colorId": 1 }
```

Wallet responses contain `id`, `name`, `initialValue`, `currentValue`, `favorite` and nested `color` (`id`, `name`, `value`, `isGlobal`). Color `value` is an integer RGB value, not a CSS string.

### Wallet account/card metadata

POST and PUT accept optional `details`. When present this is a complete replacement of the
metadata: nullable fields omitted from that object are cleared. Omitting `details` preserves
existing metadata on PUT and creates a generic bank/EUR balance container on POST for older clients.
Opening balances remain immutable on PUT; `initialValue` is only accepted on POST and this endpoint
does not make ledger adjustments. The wallet kind is also immutable after creation: PUT may repeat
the existing `details.kind`, but a different kind returns 400 `validation_failed` with field `kind`
and reason `immutable_kind`, regardless of balances, movements or linked cards.

Example prepaid creation (names and values are synthetic):

```json
{
  "name": "Daily prepaid",
  "initialValue": 150.00,
  "colorValue": 3897855,
  "details": {
    "kind": "prepaid", "currency": "EUR", "institution": "Example bank",
    "network": "visa", "lastFour": "1234", "expiry": "2029-08", "shareable": false
  }
}
```

Supply exactly one of `colorId` (owned/global existing colour) or `colorValue` (integer RGB,
0 through 16777215) on creation. PUT may omit both to retain the existing colour.
RGB values reuse an available colour, or create a private colour in the same transaction.
No additional colour mutation endpoint is required.

`details` contains `kind`, `currency`, `institution`, `iban`, `lastFour`, `network`, `expiry`,
`linkedAccountId`, `creditLimit`, `currentSpending`, `statementDay`, `paymentDay`, `notes`, `shareable`.
Kinds are `bank`, `prepaid`, `debit`, `credit`, `cash`; currency is currently EUR.
Non-cash types require an institution. IBAN is optional for bank/prepaid and is normalized and
checked with mod-97. Card networks are visa/mastercard/amex/other; last-four and expiry (YYYY-MM)
are optional. Notes have at most 200 characters.

Debit and credit require a different owned bank account. Debit inherits its currency and effective
shareable flag from that account. Prepaid has its own balance and no linked account.
Credit requires nonnegative monetary `creditLimit` and `currentSpending`, and statement/payment
days from 1 to 31. Sharing is a stored preference, not an authorization grant or invitation.
Fields inapplicable to a type are rejected. Wallet kinds are selected on creation and cannot be
changed by an update.

GET responses additionally expose `details`, `hasOwnBalance` and `includedInTotal`.
Bank/prepaid/cash own their balances and count in wealth; debit/credit do not and retain zero
stored balances. Credit spending is metadata, not an independent wallet balance or an automatically
posted debit. Existing movement APIs reject direct financial balance changes on debit/credit;
use a balance-owning wallet. Automated billing and card-attributed transaction ledgers are deferred.

Validation errors return 400 `validation_failed` with field keys, foreign/missing resources return
404, and duplicate names or deletion with movements/linked cards return 409 `resource_conflict`.
Ownership checks and account-link/type/deletion checks run within the command transaction and
wallet locks.

Create an expense:

```json
{
  "description": "Groceries",
  "longDescription": null,
  "date": "2026-10-05",
  "value": -25.50,
  "typeId": 3,
  "walletId": 10,
  "destinationWalletId": null
}
```

Create a transfer using the seeded Transfer type:

```json
{
  "description": "Cash withdrawal",
  "date": "2026-10-05",
  "value": 50.00,
  "typeId": 1,
  "walletId": 10,
  "destinationWalletId": 11
}
```

Normal transactions use a signed, nonzero value. Transfers require a positive magnitude and two distinct owned wallets. At most two decimal places are accepted. `date` is required on creation and uses `YYYY-MM-DD`; it is not a UTC timestamp.

Transaction responses contain `id`, `description`, `longDescription`, `date`, `value`, nested `type`, nested source `wallet` and nullable `destination`. Owners and authentication data are excluded.

For PATCH, omitted `description` or `longDescription` remains unchanged; explicit JSON null clears it:

```json
{ "description": "Updated description", "longDescription": null }
```

Other nullable update fields are not generic “clear” operations; their interpretation follows the command's domain rules. HTTP DTO limits include wallet/type name 100 characters, transaction description 200 and long description 2000.

## 7.6 Transaction queries and pagination

| Parameter | Default | Accepted values / behavior |
| --- | --- | --- |
| `page` | `1` | One-based positive page number |
| `pageSize` | `50` | 1–100 |
| `from`, `to` | Unset | Inclusive calendar-date boundaries; from must not exceed to |
| `walletId` | Unset | Positive owned wallet ID; transfers match source or destination |
| `typeId` | Unset | Positive type ID |
| `kind` | Unset | `Income`, `Expense`, `Transfer` |
| `search` | Unset | Up to 100 characters; searches description and long description |
| `sortBy` | `Date` | `Date`, `Description`, `Value`, `Type`, `Wallet` |
| `direction` | `Descending` | `Ascending`, `Descending` |

Ordering ends with ID in the same direction to keep pages stable. The list shows only the source side of transfers.

```http
GET /api/v1/transactions?page=1&pageSize=20&kind=Expense&from=2026-10-01&to=2026-10-31&sortBy=Date&direction=Descending
```

The response shape is:

```json
{ "page": 1, "pageSize": 20, "totalCount": 42, "items": [] }
```

The array above is abbreviated; a real response contains matching rows. Dashboard responses contain `incoming`, `expense`, `incomingCategories` and `expenseCategories`. Expenses are negative. Breakdown objects contain a type and its net signed value. Transfers are excluded.

### Extended categories, transaction overview and CSV

POST `/api/v1/transaction-types` still accepts a name alone. Optional fields: `parentId` (null),
`icon` (tag), `color` (grey), `description` (500 characters), `keywords` (1000 characters),
`useInReports` (true). Text is trimmed; names remain nonblank and at most 100 characters.
The report preference does not change dashboard totals, balances or exports. Keywords do not
automatically classify transactions. Icons: shopping, home, transport, food, utilities, work,
entertainment, health, tag. Colors: red, orange, yellow, green, cyan, blue, purple, grey.
Parents must be available ordinary categories; reserved Transfer/Adjustment and cyclic chains are
rejected. Category GETs and nested types include all metadata and `systemKind` (Transfer,
Adjustment or null), derived from reserved IDs. Category PATCH/DELETE are not provided.

GET `/api/v1/transactions/overview` requires inclusive `from`/`to` and shares wallet/type/kind/search
filters with the list, including destination wallets and notes. Its response contains `period`,
`totals`, `previous`, `expenseCategories` (typeId/value), `weekly` and `daily`. Totals contain
nonnegative income/expense/transfer volume, incomeCount/expenseCount/transferCount and movementCount.
Transfers count once and never enter income/expense; category expenses are not offset by income.
Daily includes empty days; weekly contains seven-day blocks anchored to from, with a partial last
block. Aggregates use one MySQL repeatable-read transaction. Separate list requests may observe a
different instant. Full months compare with the preceding calendar month; other periods compare
with the immediately preceding inclusive interval of equal length. Unsupported previous dates
return 400. Zero comparison bases are exposed as totals without server percentage division.
The existing `/api/v1/dashboard` keeps its signed-expense contract. Latest rows use the ordinary
list with pageSize=4 and Date/Descending, preserving all filters.

GET `/api/v1/transactions/export` requires the period, shares those filters, and accepts locale=en|it
(default en). It streams all matches in date/ID descending order, independently of table pagination.
UTF-8 CSV includes BOM, semicolons, ISO dates, invariant numeric amounts, quoted/formula-protected
text and Content-Disposition attachment. Columns: date, description, kind, category, source wallet,
destination, signed amount. Empty results include headers only. Content-Disposition is exposed by
CORS; configure proxy timeouts for the expected export volume.

## 7.7 Errors and correlation

V1 application errors use Problem Details, normally `application/problem+json`, with a stable `code` and `traceId`. Validation errors can include `errors` keyed by field. Some framework-generated results can have a smaller standard Problem Details body; clients should tolerate missing custom extensions.

| HTTP status | Typical code | Meaning |
| --- | --- | --- |
| 400 | `validation_failed` | Invalid body, query, precision or date range |
| 400 | `antiforgery_validation_failed` | Missing/invalid CSRF cookie or header |
| 400 | `invalid_token` | Invalid/expired confirmation or reset token |
| 401 | `authentication_required`, `invalid_credentials` | Missing session or failed login |
| 404 | `resource_not_found` | Missing resource or resource not owned by the current user |
| 409 | `resource_conflict` | Duplicate resource or wallet that cannot be deleted |
| 422 | `domain_rule_violated` | Invalid financial operation |
| 423 | `account_locked` | Temporary account lockout |
| 429 | `rate_limit_exceeded` | Account abuse limit reached |
| 500 | `unexpected_error` | Unexpected server failure |

Responses include `X-Trace-ID` and `X-Correlation-ID`. Include these identifiers when reporting a failure, without attaching passwords, cookies or financial payloads.

## 7.8 Removed endpoints

The routes `/user/add`, `/user/login`, `/user/info`, `/color`, `/wallet`, `/type`, `/transaction` and `/dashboard/all` are no longer mapped. Clients must use the account and financial endpoints above, with Identity cookies, CSRF and the v1 pagination/payload contracts. There is no response envelope or raw-token fallback, and no legacy Swagger document.


---

| Previous | Documentation | Next |
| :--- | :---: | ---: |
| [← Settings reference](06-settings-reference.md) | [Index](README.md) | [Database and business rules →](08-database-and-business-rules.md) |
