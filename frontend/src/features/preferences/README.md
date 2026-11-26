# Profile preferences

The account menu's Preferences entry opens `/dashboard/preferences` (or
`/it/dashboard/preferences`), which redirects to the transaction-type page at
`/dashboard/preferences/transaction-types`, preserving the active locale.

`PreferencesLayout` provides the shared heading for preference subpages.
`PreferencesNavigation` lists the available sections with real locale-aware links,
and the active section. Inside the preferences area, `AppShell` keeps the dashboard
sidebar and adds the dedicated preferences sidebar immediately to its right, followed
by the page content. Both menus use the same sidebar styling. On mobile, the original
dashboard bottom navigation stays visible and its native navigation sheet includes
both dashboard links and a separate preferences group. Additional preference
pages can share this layout and add their destination to the section list.

Transaction types appear in a two-column semantic table: the category's colored
icon beside its name, and a compact edit action. The table fits narrow screens
without a fixed minimum width. Parent categories start collapsed; their disclosure
buttons reveal the full indented subtree, including further nested branches.
Each parent can also collapse its own branch independently.
Search automatically expands matching ancestors, and saving a new or moved child
opens its destination branch. The edit button remains independent of expansion.
Cards, fields, native dialogs,
category icons, semantic colors and themes reuse the existing UI components.

Transaction types are the categories used by movements. Creation and editing both
render `CategoryEditorDialog`, the existing component opened from the movement form,
with its original layout, fields and English/Italian dictionary. The duplicated
preferences editor has been removed. All seven fields are shared: name, parent,
icon, color, description, keywords and use in reports. Preferences use the canonical
`ApiTransactionType` shape rather than a separate category model.

The page loads real categories from `GET /api/v1/transaction-types` using the shared
cookie-based client, with cancellation, loading, empty and retryable error states.
Reserved `systemKind` types are excluded; other global categories are visible as
read-only and remain available as parents. No demonstration data or local save mode remains.

The shared dialog creates through `POST /api/v1/transaction-types` and updates through
`PUT /api/v1/transaction-types/{id}`. Both use antiforgery, normalize form values and
reload the canonical DTO after saving. Failed DTO reloads retry the read without
repeating the successful write. Field errors and failed submissions retain entered
values. Successful writes refresh the page's full category list; creation clears
search and new/moved children open their destination branch. Cancel does not write.

The backend owns authorization, name uniqueness, supported icons/colors and hierarchy
validation, including concurrent cycle prevention. Only owned non-system categories
can be updated. Editing metadata retains category IDs and transaction references;
no balance or movement values are changed. See the
[category API contract](../../../../backend/webserver/Api/V1/transaction-types.md).

The hierarchy is sorted within each branch. Search keeps matching rows and their
ancestors visible. Moving a type moves its whole subtree; the parent picker and
submit validation exclude the edited type and all descendants. A type can also
be moved back to the root. The form uses React Hook Form, validates names and
supports cancellation without updating the list. All interface text is available
in English and Italian; user-edited names are kept as entered.

Verification follows [frontend instructions](../../../AGENTS.md): only
`npm --prefix frontend run build`, without servers, tests or browser checks.
