# Handover

## What this is
Building/society maintenance management app. Next.js 16 (App Router) + Prisma 7 + Supabase Auth, Postgres via Supabase.

## Stack
- Next.js 16, React 19, Tailwind 4, shadcn/ui components (`src/components/ui`)
- Prisma 7 (`prisma/schema.prisma`), generated client output to `src/generated/prisma` (gitignored — regenerated via `postinstall` script)
- Supabase for auth (`src/lib/supabase/`); `Profile` model mirrors `auth.users`
- Roles: `SUPER_ADMIN` (→ `/admin`) and `MEMBER` (→ `/member`), routed from `src/app/page.tsx`

## Features built (as of 2026-07-30)
- **Admin**: floors/flats, members (users), monthly payments + per-flat additional charges, expenses (with categories), electricity bills (lift/common area), cleaners (name/salary, monthly paid/unpaid tracking — see below), settings (building name, opening balance, member financial visibility toggle), audit log
- **Member**: dashboard — own flat, payment history, additional charges, optional building-wide financial overview (gated by settings toggle)
- **Auth**: `/login` via Supabase
- **Nav**: `src/components/nav-shell.tsx` — off-canvas drawer sidebar below `md` breakpoint (hamburger button, backdrop, closes on route change), static sidebar on desktop. Drives both `/admin` and `/member` layouts.
- **Cleaners** (`/admin/cleaners`, super-admin only): `Cleaner` (name, monthly salary) + `CleanerPayment` (month/year, paid/unpaid, same shape as `MaintenancePayment`). Paid salaries are folded into `totalOutgoing`/closing balance in `src/lib/finance.ts` alongside expenses and electricity bills — no separate ledger, so it deducts from the common fund automatically.

No dedicated in-repo plan/TODO doc exists — DB migration names double as a rough changelog (`init` → `stage2_expenses_bills_settings` → `add_cleaners`).

## Deployment
- **GitHub**: https://github.com/abbaschallawala95/buildinmaint (branch `main`)
- **Vercel**: project `buildinmaint` under team `abbas28s-projects`, auto-deploys on push to `main`. Vercel CLI is linked locally (`.vercel/` dir, gitignored) so `vercel env` / `vercel deploy --prod` work directly from this machine.
- **Live URL**: https://buildinmaint.vercel.app

### Env vars (set in Vercel project settings + local `.env`, never commit values)
- `DATABASE_URL` — Supabase Postgres. **Two different connections in use on purpose:**
  - Local `.env` (dev machine): session-mode pooler, port `5432` — required for `prisma migrate dev` (transaction-mode pooler doesn't support the advisory locks migrations need).
  - Vercel Production + Preview: transaction-mode pooler, port `6543` with `?pgbouncer=true` — required for serverless runtime (see "Known fix" below). Vercel never runs migrations at build time (`postinstall` only runs `prisma generate`), so this split is safe.
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

### Known fixes already applied
- Vercel build initially failed with `module-not-found` on `@/generated/prisma/client` because the generated client is gitignored and nothing ran `prisma generate` in a fresh checkout. Fixed by adding `"postinstall": "prisma generate"` to `package.json`.
- Production started throwing "server error" on refresh: Supabase session-mode pooler caps at 15 clients, and each serverless invocation opened its own Prisma connection, exhausting it (`EMAXCONNSESSION`, confirmed via `vercel logs`). Fixed by switching Vercel's `DATABASE_URL` to the port-6543 transaction-mode pooler (`vercel env update DATABASE_URL production/preview --value ...`), then `vercel deploy --prod`.

## Session log
- **2026-07-30**: User confirmed mobile nav drawer, Cleaners section, and the refresh/connection-pool fix all work on phone testing.
- **2026-07-30**: Fixed member edit dialog (`/admin/users`) — previously only Name + Phone were editable; Email is now editable too, matching the fields available at creation (minus password, which has its own "Reset Password" flow). Editing email now also updates the Supabase auth user's email (`admin.auth.admin.updateUserById`), not just the `Profile` row, so login stays in sync. Committed as `e5b2806` and pushed to `main` — deployed via Vercel auto-deploy.
- **2026-07-31**: Added flat (re)assignment to the same member edit dialog — previously flat assignment could only be changed from the Floors & Flats page's flat editor, so a member created without a flat, or one added with the wrong flat, couldn't be fixed from the Members page. `updateMember` (`src/app/admin/users/actions.ts`) now also accepts `flatId` and, in a transaction, clears the member's old flat (if any) and sets `memberId` on the newly chosen flat; a unique-constraint clash (flat already taken) surfaces as a friendly error instead of a crash. The flat dropdown in `edit-member-dialog.tsx` is scoped per-member in `page.tsx` to unassigned flats + the member's current flat, matching the same scoping logic already used in `floors/page.tsx`'s `FlatDialog`. Not yet committed/pushed.

## Where we left off
Member edit dialog now supports editing all creation-time fields (name, email, phone) plus flat assignment/reassignment. The flat-assignment change is implemented and type-checks clean, but not yet committed or deployed.

## Next session: start here
1. Confirm the flat-assignment-in-edit change got committed/pushed/deployed (or do it if not).
2. Ask if there's anything new to test or build.
