# Transaction categories

Transaction types are the same categories used by movements and profile preferences.
All endpoints require the existing Identity cookie. Mutations use the existing
antiforgery token/header and `ExecutorManager`; errors use Problem Details.

| Method | Endpoint | Result |
| --- | --- | --- |
| GET | `/api/v1/transaction-types` | Available personal and global categories, sorted by name then ID |
| GET | `/api/v1/transaction-types/{id}` | Canonical category DTO, or 404 for a missing/foreign category |
| POST | `/api/v1/transaction-types` | Create a personal category; 201 with `{ "id": 123 }` and Location |
| PUT | `/api/v1/transaction-types/{id}` | Replace editable metadata of an owned category; 204 |

POST and PUT share `TransactionTypeWriteRequest`:

```json
{
  "name": "Groceries",
  "parentId": null,
  "icon": "shopping",
  "color": "green",
  "description": null,
  "keywords": null,
  "useInReports": true
}
```

PUT is a full metadata replacement. `parentId: null` moves a category to the root;
null/blank description and keywords clear those fields. Name is required (up to
100 characters); description and keywords have limits of 500 and 1000. Defaults
for omitted optional fields match POST: root parent, tag icon, grey color, null
description/keywords and `useInReports: true`. Names/text are trimmed on write.
Icons and colors retain the existing supported key sets in `TransactionTypeConfigurationPolicy`.

Only the authenticated owner's personal category can be updated. Missing, foreign,
global and reserved categories return 404; global/system types cannot be changed
through this endpoint. A parent must be available to the owner and cannot be Transfer,
Adjustment, the edited category itself or one of its descendants. Invalid configuration
or cycles return 400 with field errors (`parentId` / `invalid_parent` for cycles).
A missing or foreign parent returns 404. Duplicate personal names return 409;
uniqueness follows the existing database collation and `(UserId, Name)` unique index.

`AddTransactionTypeCommand` and `EditTransactionTypeCommand` share configuration and
ancestor validation. Each acquires a transactional row lock on the authenticated
owner before reading the category graph, serializing same-owner hierarchy writes.
This prevents concurrent reciprocal moves from passing against separate snapshots.
The executor retains ownership of transaction commit/rollback and deadlock retries.
Moving a parent preserves its descendants and existing movement/category IDs.
These commands do not update movement amounts, wallet balances or financial dates.

No database model, schema version, archive format or migration change is required:
all edited columns and constraints already exist. No database initialization or
data mutation is performed by the build.
