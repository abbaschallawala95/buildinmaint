# Admin Analytics + Sharing — Design

**Date:** 2026-10-26 · **Status:** approved by user · **Replaces:** `2026-10-26-member-analytics-design.md` (member self-serve analytics removed)

## Goal
Admins (super admin + building admin) get a full, customisable Analytics page per building. They choose what to share with members; members see only shared reports, from their dashboard.

## Admin → Analytics (`/admin/analytics`)
Scoped by `requireAdminContext()` (building admin = own building; super admin = switcher building).

Controls (one GET form, no client JS):
- **Month**: single list "October 2026 … January 2026" (2026 → current month, newest first) → `?period=2026-10`. Year = that month's year.
- **Compare with**: same list + "None" → `&cmp=2026-05`.
- **Sections** checkboxes → `&s=summary&s=chart…`; none in the URL = all on.

| Key | Section | Shareable |
|---|---|---|
| `summary` | Year tiles: spent, collected, saved/short, costliest month | yes |
| `chart` | Income vs expense bars per month (tap month = select) | yes |
| `focus` | Month vs previous: per-head change, "Additional this month", "Not this month" | yes |
| `compare` | Selected month vs the Compare month, per head (expenses + income), difference | yes (needs `cmp`) |
| `expenses` | Expense head × month grid with ↑/↓ and **New** | yes |
| `income` | Income head × month grid (Maintenance, each additional-income description) | yes |
| `collection` | Maintenance expected vs collected per month (%); flats behind for the selected month | yes — **members get % only, never flats** |

Actions on the page:
- **Export PDF / Excel** of the ticked sections (`/api/admin/export/analytics`, same query string), via existing `buildPdfReport` / `buildExcelReport`.
- **Share with members**: upsert `SharedAnalytics` for (building, year, month) with the ticked sections and compare month. Audit-logged.
- **Shared reports** list: month, sections, shared by/when, Open (loads that config), **Unshare** (delete).

## Members
- Remove `/member/monthly-data/analytics` and the Analytics button (Monthly Data keeps its month picker).
- Member dashboard: **Shared analytics** card listing this building's shared reports (newest month first); hidden when none.
- `/member/analytics/[id]`: renders the shared sections read-only with live numbers. 404 unless the report belongs to the member's building. Independent of "Members Can View Building Finances" (sharing is the explicit permission).

## Data
`SharedAnalytics { id, buildingId → Building (cascade), year, month, sections String[], compareYear?, compareMonth?, sharedByName, sharedAt }`, unique (buildingId, year, month), RLS enabled like every table. Migration `20261026000000_add_shared_analytics`.

## Rules (unchanged from member version)
Head per transaction; change vs previous month (Jan vs previous Dec); **New** = nothing the month before; months before the first transaction of the year are trimmed in chart/grids. Collection: expected = `rateForMonth` per flat with a rate; collected = PAID maintenance payments for that month/year.

## Code
- `src/lib/analytics.ts` (pure): `buildYearAnalytics` → `expenseHeads` + `incomeHeads`; `compareMonths`; `SECTIONS`; `parseSections`, `periodOptions`. Self-check `scripts/check-analytics.ts`.
- `src/lib/analytics-data.ts` (server): `getAnalytics(buildingId, { year, month, cmp })` incl. collection.
- `src/components/analytics/sections.tsx`: one component per section, shared by admin + member views.
- `src/app/admin/analytics/{page,actions,share-buttons}.tsx`, export route, nav link.
- `src/app/member/analytics/[id]/page.tsx`, dashboard card.

## Testing
Self-checks; tsc; lint; browser: admin customises/compares/exports/shares; member sees only shared sections, no flats; unshare hides; another building's report id → 404; phone width; 2 themes + dark.
