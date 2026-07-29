# Handover

## What this is
Building/society maintenance management app. Next.js 16 (App Router) + Prisma 7 + Supabase Auth, Postgres via Supabase.

## Stack
- Next.js 16, React 19, Tailwind 4, shadcn/ui components (`src/components/ui`)
- Prisma 7 (`prisma/schema.prisma`), generated client output to `src/generated/prisma` (gitignored — regenerated via `postinstall` script)
- Supabase for auth (`src/lib/supabase/`); `Profile` model mirrors `auth.users`
- Roles: `SUPER_ADMIN` (→ `/admin`) and `MEMBER` (→ `/member`), routed from `src/app/page.tsx`

## Features built (as of 2026-07-30)
- **Admin**: floors/flats, members (users), monthly payments + per-flat additional charges, expenses (with categories), electricity bills (lift/common area), settings (building name, opening balance, member financial visibility toggle), audit log
- **Member**: dashboard — own flat, payment history, additional charges, optional building-wide financial overview (gated by settings toggle)
- **Auth**: `/login` via Supabase

No dedicated in-repo plan/TODO doc exists — DB migration names double as a rough changelog (`init` → `stage2_expenses_bills_settings`).

## Deployment
- **GitHub**: https://github.com/abbaschallawala95/buildinmaint (branch `main`)
- **Vercel**: project `buildinmaint` under team `abbas28s-projects`, auto-deploys on push to `main`
- **Live URL**: https://buildinmaint.vercel.app

### Env vars (set in Vercel project settings + local `.env`/`.env.local`, never commit values)
- `DATABASE_URL` — Supabase Postgres, currently using the port-5432 direct connection (see `ponytail:` comment in `.env` — switch to the port-6543 pooler if Vercel hits connection limits)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

### Known fix already applied
Vercel build initially failed with `module-not-found` on `@/generated/prisma/client` because the generated client is gitignored and nothing ran `prisma generate` in a fresh checkout. Fixed by adding `"postinstall": "prisma generate"` to `package.json`.

## Where we left off
Code pushed and deployed successfully (login page renders, DB connects). User was about to manually test the live site (login, admin flows, member flows) and report back with any bugs or next feature requests.

## Next session: start here
1. Ask the user what they found testing the live site — bugs, missing features, or "looks good, build X next."
2. If nothing reported yet, ask before assuming everything works.
