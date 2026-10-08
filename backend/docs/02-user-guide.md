**[Documentation](README.md) / Part I · The application**

# 02 · User guide

> Manage your account, organize wallets and record everyday financial activity.

<details>
<summary><strong>On this page</strong></summary>

- [2.1 Open the application](#21-open-the-application)
- [2.2 Create and verify an account](#22-create-and-verify-an-account)
- [2.3 Sign in, sign out and recover access](#23-sign-in-sign-out-and-recover-access)
- [2.4 Create your first wallets](#24-create-your-first-wallets)
- [2.5 Record income or an expense](#25-record-income-or-an-expense)
- [2.6 Move money between wallets](#26-move-money-between-wallets)
- [2.7 Find, edit or delete transactions](#27-find-edit-or-delete-transactions)
- [2.8 Read the dashboard](#28-read-the-dashboard)
- [2.9 Language, appearance and mobile use](#29-language-appearance-and-mobile-use)

</details>

---

## 2.1 Open the application

For a standard local installation, open `http://localhost:3000`. Use the URL supplied by your operator for a hosted installation. The backend and database must be running for account and financial pages to work.

English is the default language without a URL prefix, for example `/dashboard`. Italian uses `/it`, for example `/it/dashboard`. The URL determines the language; browser-language detection is disabled. Names and descriptions you enter are not translated.

## 2.2 Create and verify an account

1. Open `/register` (or `/it/register`).
2. Enter your first name, last name, username, email address and password.
3. Submit the form and follow the displayed instructions. If email verification is enabled, check your email for the confirmation link.
4. When required, open the link to complete email verification, then sign in at `/login`. If verification is disabled, sign in immediately without a confirmation link.

Passwords must contain at least 12 characters, uppercase and lowercase letters, a digit and a non-alphanumeric character. The API caps passwords at 128 characters and requires usernames between 3 and 64 characters. Email addresses must be unique.

Registration and recovery responses intentionally avoid confirming whether an account exists. A generic acceptance message does not prove that email delivery succeeded. If verification is enabled and no message arrives, check spam and use `/resend-confirmation`; ask the operator to check SMTP configuration if the issue persists. Confirmation resend is hidden when verification is disabled. Password recovery still needs email delivery in either mode.

## 2.3 Sign in, sign out and recover access

Sign in with your username or email and password. The browser receives an encrypted HttpOnly session cookie; you do not need to copy or manage an authentication token. Login requests a two-hour ticket normally, or a persistent 30-day ticket when “Remember” is selected. Cookie middleware also enables sliding renewal.

Use the sign-out action in the application header when finished. Logout signs out the current browser. Resetting the password updates the security stamp and invalidates existing sessions when they are next validated.

If you forget your password:

1. Open `/forgot-password` and submit your email.
2. Follow the emailed link to `/reset-password`.
3. Enter a password satisfying the current rules and sign in again.

Account email tokens have a one-hour lifetime. Use a fresh confirmation/reset email if a link expires. Five failed password attempts can lock an account for 15 minutes; account endpoints also apply rate limits. Repeated attempts during a lockout are not a recovery method.

## 2.4 Create your first wallets

1. Open **Wallets** at `/dashboard/wallet`.
2. Enter a descriptive name such as “Current account” or “Cash.”
3. Enter the opening balance and select a color.
4. Save. The current balance initially equals the opening balance.

An opening balance can be zero or negative. Wallet names must be unique within your account. Use the favorite action to mark or unmark a wallet. Edit changes its name and color; the opening balance is disabled when editing an existing wallet.

Deleting a wallet requires confirmation and succeeds only if it has no transactions. This includes either side of a transfer. A zero balance alone does not make a wallet empty.

## 2.5 Record income or an expense

1. Open **Transactions** at `/dashboard/transaction`.
2. Enter a description, a positive amount and the transaction date.
3. Select the transaction type and wallet.
4. Choose **Income** or **Expense**, then save.

The current browser form accepts a positive magnitude and applies the sign from the selected kind: income increases the balance; an expense decreases it. A direct API client must supply the signed value itself.

For example, a wallet starting at EUR 1,000 becomes EUR 1,200 after income of EUR 200, then EUR 1,174.50 after an expense of EUR 25.50. Do not enter more than two decimal places: the backend rejects excess precision instead of silently rounding it.

The date is a calendar date, not an exact instant. It is stored independently of timezone. The production form currently exposes description, amount, date, type and wallet; the API additionally supports a long description.

## 2.6 Move money between wallets

1. Ensure you have at least two wallets.
2. In the transaction form, select **Transfer**.
3. Select the source wallet and a different destination wallet.
4. Enter a positive amount, description and date, then save.

Transferring EUR 50 from “Current account” to “Cash” subtracts EUR 50 from the source and adds EUR 50 to the destination. The backend saves both linked entries atomically. Your combined wallet balance does not change.

The transaction list displays the source side once, usually with a negative value and the destination name. Transfers are excluded from dashboard income and expense totals. A transfer can leave the source balance negative.

## 2.7 Find, edit or delete transactions

The current page provides description search, an All/Income/Expense/Transfer filter and pagination. Choose 10, 20, 50 or 100 rows per page. Records are requested from the backend in descending date order with a stable ID tie-breaker.

Use **Edit** on a row to fill the form with its values, then save the changes or cancel. Changing a transaction updates the affected wallet balances. Use **Delete** and confirm to remove a transaction; deleting a transfer removes its linked pair and reverses both balance effects.

Additional API filters, including date range, wallet, type and ordering, are documented in [chapter 07](07-api-reference.md). The richer development previews can display controls beyond those exposed on the current live page.

## 2.8 Read the dashboard

Open `/dashboard` and choose the start and end dates. The initial selection covers the current month. Both boundary dates are included.

The dashboard shows recorded income and expenses, plus breakdowns by transaction type. Opening balances and transfers are excluded. These are period totals, not the sum of all current wallet balances. At API level, expense totals are negative signed values. Type breakdowns use the net signed amount per type, so a type used for both positive and negative entries can show a net result.

## 2.9 Language, appearance and mobile use

The app has shared light/dark styling and follows the system theme initially. A manual theme control is available in the development design-system catalog; the current live header does not expose the full theme and language controls described in the design plan. Open the corresponding `/it/...` URL to use Italian, or remove `/it` for English. Save changes before navigating to another language: the planned dirty-form confirmation is not implemented across the current live forms.

On small screens, open the navigation menu to switch pages. `/dashboard/transaction/add_mobile` currently redirects to the regular transaction page. The dedicated three-touch Quick Add is still planned.

If a request fails, see [troubleshooting](10-development-and-troubleshooting.md). The interface can show a generic failure while the API returns a more specific validation or conflict code.


---

| Previous | Documentation | Next |
| :--- | :---: | ---: |
| [← Application overview](01-application-overview.md) | [Index](README.md) | [Installation and startup →](03-installation-and-startup.md) |
