# Member Month Picker — Design

**Date:** 2026-10-26 · **Status:** approved by user

## Goal
Members can view Monthly Data for any past month, not only the current one.

## Behaviour
- `/member/monthly-data` **always** shows the Month + Year picker (no admin switch).
- Year is a dropdown from **2026** to the current year (grows automatically each January).
- No future months: for the current year the Month list stops at the current month (November appears on 1 Nov, IST). Past years list all 12. A future month in the URL falls back to the current month. The list follows the chosen year (small client component `month-year-picker.tsx`).
- Opens on the current month; **View** loads `?month=&year=`.
- Year outside 2026…current year (e.g. typed into the URL) → current year. Month is already sanitised by `monthParam()`.
- Still hidden entirely when "Allow members to view financials" is off (unchanged).

## Admin Settings
- Remove the "Members Can Browse All Months" switch (UI + `actions.ts` field). The `allowMembersViewAllMonths` DB column stays, unused — no migration.

## Testing
Browser as the dev test member: August 2026 shows different totals than October; year list is 2026 only. `npx tsc --noEmit`, `npm run lint`, `npm test`.
