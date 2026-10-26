# Member Month Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Members can pick any month/year (2026 → now) on `/member/monthly-data`.

**Architecture:** Drop the `allowMembersViewAllMonths` gate in the page and Settings form; swap the free year input for a 2026…current-year `<select>`. DB column left unused (no migration).

**Tech Stack:** Next.js 16 server component, plain GET `<form>`.

**Spec:** `docs/superpowers/specs/2026-10-26-member-month-picker-design.md`

## Global Constraints
- Local first; push only with user approval. No DB/migration changes. Test data English.

---

### Task 1: Always-on picker with year dropdown

**Files:**
- Modify: `src/app/member/monthly-data/page.tsx`
- Modify: `src/app/admin/settings/page.tsx` (remove "Members Can Browse All Months" switch)
- Modify: `src/app/admin/settings/actions.ts` (remove `allowMembersViewAllMonths` from schema/parse)

- [ ] **Step 1:** In the member page replace the gated month/year logic with:

```tsx
const month = monthParam(params.month);
const thisYear = now.getFullYear();
const requestedYear = Number(params.year);
const year = requestedYear >= FIRST_YEAR && requestedYear <= thisYear ? requestedYear : thisYear;
const years = Array.from({ length: thisYear - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
```
with `const FIRST_YEAR = 2026;`, render the form unconditionally, and replace the year `<Input>` with a `<select name="year">` over `years` (same classes as the month select).

- [ ] **Step 2:** Delete the switch block in Settings page and the field in `actions.ts`.

- [ ] **Step 3: Verify:** `npx tsc --noEmit && npm run lint && npm test`; browser as the dev test member: `?month=8&year=2026` shows August totals ≠ October; year dropdown lists only 2026; `?year=1999` falls back to 2026. Admin Settings no longer shows the switch and still saves.

- [ ] **Step 4: Commit after user approval**

```bash
git add src/app/member/monthly-data/page.tsx src/app/admin/settings docs/superpowers
git commit -m "Let members pick any month on Monthly Data"
```
