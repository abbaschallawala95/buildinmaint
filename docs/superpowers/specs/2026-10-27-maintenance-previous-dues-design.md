# Maintenance Menu — Previous Dues — Design

**Date:** 2026-10-27 · **Status:** approved by user

## Problem
Previous (pre-app) dues could only be added from a flat's page under Payments ("Add Previous Year Dues", a year + amount), with no edit, no unpay, and no building-wide view. The owner couldn't find it and thought the maintenance module was gone. Payments (monthly maintenance) stays as it is.

## Maintenance menu (`/admin/maintenance`, admins, scoped by `requireAdminContext`)
1. **Dues overview** — one row per flat: member, unpaid monthly maintenance (same `buildDueSchedule`/`totalDue` as the flat page), unpaid previous dues, other unpaid charges, total. Flat links to `/admin/payments/[flatId]`. Footer totals.
2. **Previous dues** — every previous-due entry with filters (flat, Unpaid/Paid/All). Add / Edit / Delete / Mark paid (payment date) / Mark unpaid.
   Fields: flat, type (Maintenance | Other), note (e.g. "Maintenance dues 2025"), amount, optional due date; payment date when paid.

## Data
Previous dues stay `AdditionalCharge` rows (so member dashboard, outstanding dues and income keep working), marked by a new nullable column `previousDueType` (`MAINTENANCE` | `OTHER`; null = ordinary charge). Migration `20261027000000_add_previous_due_type` adds it and backfills existing `Previous Year Dues (…)` rows as `MAINTENANCE`.
Analytics head for paid previous dues: "Previous dues — maintenance/other".

## Code
- `src/lib/maintenance-dues.ts`: `splitUnpaidCharges(charges)` → `{ previous, other }` (self-check in `scripts/check-dues.ts`).
- `src/app/admin/maintenance/{page,actions,previous-due-dialog,due-row-actions}.tsx`; nav link "Maintenance".
- Flat page: "Add Previous Year Dues" opens the new dialog; previous dues get a badge. Old `addPreviousYearDues` removed.
- Every action audit-logged; every lookup scoped to the building.

## Testing
Self-check; tsc; lint; browser: add/edit/pay/unpay/delete, totals = dashboard Outstanding Dues, member sees the due, foreign id rejected, phone width.
