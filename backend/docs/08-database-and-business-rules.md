**[Documentation](README.md) / Part II · The implementation**

# 08 · Database and business rules

> Understand data ownership, balance calculations, transfer invariants and schema migrations.

<details>
<summary><strong>On this page</strong></summary>

- [8.1 Persistence structure](#81-persistence-structure)
- [8.2 Ownership and reference data](#82-ownership-and-reference-data)
- [8.3 Money and dates](#83-money-and-dates)
- [8.4 Balance calculation](#84-balance-calculation)
- [8.5 Transfer invariants](#85-transfer-invariants)
- [8.6 Database creation and migrations](#86-database-creation-and-migrations)
- [8.7 Integrity and recovery](#87-integrity-and-recovery)

</details>

---

## 8.1 Persistence structure

One external MySQL database stores financial and Identity tables. `MoneyGestorContext` extends `IdentityDbContext<ApplicationIdentityUser, IdentityRole<UInt64>, UInt64>` and manages the complete model. A singleton `database_metadata` row identifies the ready schema version; there is no EF migration history.

| Entity / area | Purpose | Important fields or relationships |
| --- | --- | --- |
| `ApplicationIdentityUser` | Single application and Identity user, stored in `AspNetUsers` | Numeric ID, first/last name, username, email, Identity password hash and security state |
| `WalletDb` | Owned balance container | Opening `Value`, `CurrentValue`, `BalanceVersion`, favorite, color and owner |
| `ColorDb` | Wallet styling | RGB value and optional owner; no owner means global |
| `TransactionTypeDb` | Financial classification | Optional parent, icon/color, description, keywords, report preference and owner |
| `TransactionDb` | Signed financial entry | Date, value, descriptions, wallet, type, owner and reciprocal transfer link |
| Other Identity tables | Roles, claims, provider logins and account tokens | Numeric user/role references managed by Identity |

```mermaid
erDiagram
    USER ||--o{ WALLET : owns
    USER ||--o{ TRANSACTION : owns
    USER ||--o{ COLOR : defines_private
    USER ||--o{ TRANSACTION_TYPE : defines_private
    WALLET ||--o{ TRANSACTION : contains
    COLOR ||--o{ WALLET : styles
    TRANSACTION_TYPE ||--o{ TRANSACTION : classifies
    TRANSACTION o|--o| TRANSACTION : transfer_pair
```

Application table names include `AspNetUsers`, `wallet` and `transaction`; inspect the model/migrations rather than guessing SQL naming from C# plural names. API DTO limits can be stricter than database column lengths. `AspNetUsers.Id` is an auto-generated `BIGINT UNSIGNED`, referenced directly by financial owner/author foreign keys. Usernames and emails are stored only in Identity, with unique normalized indexes. The old `user` and `login` tables, password placeholder and mapping ID are absent from the new schema.

## 8.2 Ownership and reference data

Wallets and transactions belong to exactly one user. The authenticated account supplies that owner. `UserId` and `UserInsertId` are both assigned to the current user; they do not implement sharing.

Global colors/types are available to everyone. Private colors/types are available only to their owner and can be attached only to that user's resources. Wallet names are unique per owner; transaction-type names are unique per owner. Financial lookups do not reveal the existence of another user's resource.

Manual initialization creates global colors and the reserved types **Transfer (ID 1)** and **Adjustment (ID 2)**. Startup only validates them and refuses conflicts without overwriting records. Import preserves these records from the archive. Other IDs depend on the installation. There is no separate category entity in the current financial model.

## 8.3 Money and dates

Amounts are .NET `decimal` and MySQL `DECIMAL(19,2)`. The domain range is plus or minus `99,999,999,999,999,999.99`; scale greater than two is rejected, including values whose decimal representation retains extra fractional places. There is no implicit rounding. Normal transaction values cannot be zero; opening/current balances may be zero or negative.

The current frontend transports numbers as JavaScript numbers. At very large amounts, JavaScript cannot represent the backend decimal range exactly; backend storage precision does not guarantee identical precision in every client. Avoid treating the maximum database range as a tested browser-use range.

Transaction dates are .NET `DateOnly` and MySQL `DATE`, with supported years 1000–9999. The API uses calendar dates such as `2026-10-05`. Operational timestamps and sessions use UTC; choosing a display locale does not change stored financial dates.

## 8.4 Balance calculation

For each wallet:

```text
current balance = opening balance + sum(all signed transaction values in that wallet)
```

`CurrentValue` is stored for efficient reads. Commands maintain it when creating, editing, moving or deleting a transaction. `BalanceVersion` is a concurrency token. Ordered locks and bounded retries protect concurrent mutations; retries can rerun the unit of work with a fresh context, up to five attempts.

Reconciliation compares the stored balance with the calculated balance in read-only mode. Financial integrity problems are reported rather than silently repaired. Do not directly edit balances or transfer rows as a substitute for application commands.

## 8.5 Transfer invariants

A transfer requires a positive requested magnitude and two distinct wallets belonging to the same user. The backend writes reciprocal rows with equal and opposite values: negative in the source, positive in the destination. The pair must sum to zero and share coherent type/owner/date information.

Creation and mutation of the pair are atomic. List queries hide the positive destination row so one transfer appears once. Dashboard totals exclude transfers. Deleting a transfer removes both sides and reverses both wallet effects.

## 8.6 Database creation and migrations

The current database schema version is `1`, stored in the singleton `database_metadata`
row only after a successful initialization or import. The API checks this version
and reference/financial integrity without writing data. Missing, older or newer
versions stop startup and require manual intervention.

The administrative CLI creates the complete current schema through EF on an existing
empty destination. There are no incremental EF migrations, model snapshot or migration
history. Future releases must review the schema version and explicit archive contract.
Updates export data while the source application is stopped, then import into a new
database, preserving IDs, Identity data, ownership and relationships. Format version `1`
is the first supported archive version; unsupported versions are refused before writes.

See the [manual initialization/export/import guide](database-migration-redesign.md)
for exact commands, credential handling, verification and recovery. No application
database was recreated as part of changing these source files.

## 8.7 Integrity and recovery

Category metadata has compatible defaults (parent null,
tag, grey, report preference true), without changing existing movements. Parent FKs are restrictive.
Private parents must be global ordinary categories or belong to the same owner; reserved types
and cyclic chains are rejected. User APIs do not modify global categories.

The current model includes wallet type, EUR currency, institution, optional IBAN,
card metadata, credit limit/spending, statement/payment days, notes and shareable preference.
The optional self-reference `LinkedAccountId` uses a restrictive foreign key and is indexed.
Balance containers default to bank/EUR.

Only bank/prepaid/cash own balances. Debit/credit keep zero opening/current values and are excluded
from wealth. Account linking requires the same owner and a bank type. Commands lock affected
wallets before linking, updating metadata, toggling favourite or deleting. Opening balances and
wallet kinds are immutable after creation, even when the wallet has no balance or movements.
A wallet with movements or linked cards cannot be deleted.
Credit spending is stored separately as metadata; no billing automation or
ledger adjustment is implied. Shareable does not implement shared ownership or permissions.

Startup checks financial ownership, references, balances and transfer pairs and refuses known inconsistencies. Identity account creation enforces unique normalized usernames/emails. Startup no longer imports historical accounts. Failures expose technical identifiers/counts instead of automatically changing records.

For an old schema, preserve the original and plan an explicit conversion or separate installation. For corrupted/current data, collect technical evidence and use the [backup and staging restore workflow](09-operations-and-recovery.md). Initialization and import do not silently repair financial inconsistencies.


---

| Previous | Documentation | Next |
| :--- | :---: | ---: |
| [← API reference](07-api-reference.md) | [Index](README.md) | [Operations and recovery →](09-operations-and-recovery.md) |
