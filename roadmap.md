# APIShield — Task roadmap

Source of truth for continuing the partially developed APIShield frontend. Do not rebuild existing work.

## Done (pre-existing)
- [x] Service layer with mock data + HTTP contract stubs (`src/lib/services.ts`, `mock-data.ts`, `types.ts`)
- [x] Shared UI primitives and status badges (`src/components/shared.tsx`)
- [x] Recharts wrappers: MetricChart, ContributionChart, RangePicker (`src/components/charts.tsx`)
- [x] Design tokens / theme (`src/styles.css`, IBM Plex Sans/Mono)
- [x] Formatting helpers incl. CSV download (`src/lib/format.ts`)
- [x] App shell + navigation (sidebar desktop, sheet mobile) — grouped sections for all pages
- [x] Query options layer (`src/lib/queries.ts`)
- [x] Dashboard `/`
- [x] APIs list `/apis`, create `/apis/new`, detail `/apis/$id`, edit `/apis/$id/edit` (with API form + test runner)
- [x] Predictions `/predictions`, detail `/predictions/$id`
- [x] Root-cause analysis `/analysis`, detail `/analysis/$id`
- [x] Alerts `/alerts` (acknowledge/resolve)
- [x] Monitoring `/monitoring`, Testing `/testing`
- [x] MLOps: Experiments `/experiments`, Models `/models`
- [x] Reports `/reports` (history + CSV export)
- [x] Settings `/settings` (profile, monitoring defaults, notifications, ML thresholds)
- [x] Root metadata/fonts cleanup + sonner Toaster mount

## Backlog / pending
- [x] Ad-hoc quick test from the APIs list (dialog reusing TestRunner, wired 2026-10-22)
- [x] Mock auth pages (login/signup/forgot-password wired to services.auth)
- [ ] Real backend integration (FastAPI contract in `services.ts` remote mode) — explicitly out of scope for now
