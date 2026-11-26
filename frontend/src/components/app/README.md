# Shared application header

`AppHeader` is used by the landing page, authentication screens and every dashboard route
through `AppShell`. Its layout and responsive styles live in `src/styles/app-header.css`:
the shared frame includes the logo divider, brand wave, pill controls and account dropdown,
using the active light/dark theme. Public navigation and signed-out actions retain their
existing destinations; desktop search appears when there is no public navigation.

`AppHeaderAccount` loads the existing cookie-based session and displays the real name and
initials. The local dropdown primitive handles keyboard navigation, Escape and outside
dismissal. My profile displays the session's name, username and email without editing them.
Theme and language reuses the existing theme control and locale switch, preserving the
unsaved-form language confirmation. Log out uses the existing antiforgery-protected client
and preserves pending/error notifications.

Preferences opens `/dashboard/preferences`, which redirects to its transaction-type subpage.
The preferences area keeps the dashboard navigation and adds a second sidebar immediately to
its right, before the page content. On mobile, the shared navigation sheet includes both groups.
Its transaction-type table loads real categories and the shared category editor persists
creation and updates through `/api/v1/transaction-types`. See the [preferences guide](../../features/preferences/README.md).
Settings, global search and notifications open the shared Coming soon dialog.
No new settings endpoints, search service, notification feed, fabricated notification count
or account-editing functionality are introduced by this header change.
