# APIShield: restore the dashboard and complete API management

## Goal
Continue the remixed app in place: make `/` render the existing dashboard, then complete the API management journey without replacing existing services, mock data, or design patterns.

## Work
1. Remove the conflicting blank index route so the existing `_app` dashboard is the only `/` page; preserve the existing shell and dashboard.
2. Complete API list/create/detail/edit pages using the existing query options, services, `ApiForm`, `TestRunner`, and shared UI.
3. On API detail, provide overview and configuration, test history, performance, predictions, and related alerts, with test, edit, and confirmed remove actions where supported by current demo data.
4. Invalidate relevant cached queries and show success/error feedback for mutations; keep simulated behavior clearly labeled.
5. Verify the preview build and exercise the dashboard and API create/view/edit/remove flows as far as the local demo permits.

## Technical details
- Follow existing TanStack Start route filenames and IDs under the `_app` pathless layout.
- Do not add backend functionality or expose secrets; use the established mock service layer.
