# Admin Analytics + Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Customisable admin analytics with export and per-month sharing to members.

**Architecture:** Pure analytics fold + server loader feed shared section components, rendered by the admin page (all sections) and the member shared-report page (shared sections only). Shares live in a new `SharedAnalytics` table.

**Tech Stack:** Next.js 16 server components/actions, Prisma 7, pdf-lib, exceljs.

**Spec:** `docs/superpowers/specs/2026-10-26-admin-analytics-sharing-design.md`

## Global Constraints
- Local + dev DB only; push and production migration only after user approval.
- No new dependencies. Members never see individual flats. Test data English.
- Every admin query scoped by `requireAdminContext().buildingId`; actions use `withErrors()` + `succeeded()`.

---

### Task 1: Data layer
- [ ] Extend `scripts/check-analytics.ts` (income heads, `compareMonths`, `parseSections`, `periodOptions`) → run, fails.
- [ ] Update `src/lib/analytics.ts` → check passes.
- [ ] `src/lib/analytics-data.ts` with collection.
- [ ] Schema model + migration `20261026000000_add_shared_analytics` (table, unique, FK cascade, RLS); `npx prisma migrate dev` on dev DB; `npx prisma generate`.

### Task 2: Admin page
- [ ] `src/components/analytics/sections.tsx` (move UI from the member page).
- [ ] `src/app/admin/analytics/page.tsx` + nav link. Browser check.

### Task 3: Sharing + members
- [ ] `actions.ts` (`shareAnalytics`, `unshareAnalytics`, audit), `share-buttons.tsx`.
- [ ] Delete member analytics route + button; dashboard card; `/member/analytics/[id]`.
- [ ] Browser: share → member sees; unshare → gone; foreign id → 404.

### Task 4: Export
- [ ] `/api/admin/export/analytics` route; download PDF + Excel and open.

### Task 5: Verify + handover
- [ ] `npx tsc --noEmit && npm run lint && npm test`; phone width; themes; HANDOVER entry. Commit after approval; production `migrate deploy` before push.
