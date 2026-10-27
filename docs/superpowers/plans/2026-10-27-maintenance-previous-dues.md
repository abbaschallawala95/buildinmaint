# Maintenance Menu — Previous Dues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Maintenance menu with a per-flat dues overview and full add/edit/delete/pay of previous dues.

**Architecture:** Previous dues remain `AdditionalCharge` rows tagged by a new `previousDueType` column; a server page lists the overview and entries; client dialogs call `withErrors` server actions.

**Tech Stack:** Next.js 16, Prisma 7, zod.

**Spec:** `docs/superpowers/specs/2026-10-27-maintenance-previous-dues-design.md`

## Global Constraints
- Dev DB only until the owner approves the push; production migration only with explicit go-ahead.
- Scope every query to `requireAdminContext().buildingId`; audit-log every write. Test data English.

---

### Task 1: Data
- [ ] Add a failing `splitUnpaidCharges` check to `scripts/check-dues.ts`; implement in `src/lib/maintenance-dues.ts`.
- [ ] Schema column + migration with backfill; `prisma migrate deploy` (dev), `prisma generate`, restart dev server.
- [ ] Analytics head for previous dues in `src/lib/finance.ts`.

### Task 2: Maintenance page
- [ ] Actions: `savePreviousDue` (create/update), `deletePreviousDue`, `markPreviousDuePaid`, `markPreviousDueUnpaid`.
- [ ] Page with overview + filtered list; dialog; row actions; nav link.
- [ ] Flat page uses the new dialog; remove `addPreviousYearDues`.

### Task 3: Verify
- [ ] `npx tsc --noEmit && npm run lint && npm test`; browser checks per spec; HANDOVER entry. Commit after approval.
