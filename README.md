# Build Maintain

Building / housing-society maintenance management. Admins track flats, members, monthly
maintenance dues, extra charges, expenses, electricity bills and cleaner salaries; members see
their own dues and (optionally) the building's finances. One Super Admin can run several buildings.

Live: https://buildinmaint.vercel.app · Deeper project notes and history: [HANDOVER.md](HANDOVER.md)

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 + shadcn/ui · Prisma 7 (Postgres) · Supabase Auth ·
deployed on Vercel.

## Roles

| Role | Can do |
|---|---|
| `SUPER_ADMIN` | Manage buildings and their admins; act as admin for any building via the sidebar switcher |
| `BUILDING_ADMIN` | Run one building: floors & flats, members, payments, expenses, bills, cleaners, exports |
| `MEMBER` | See their own flat's dues; building finances only if the admin enables it |

## Local setup

1. `npm install` (also runs `prisma generate`).
2. Create `.env` and `.env.local` with the variables below. **Point them at the dev Supabase
   project, never production** — local testing writes real data.
3. Apply the schema to that database: `npx prisma migrate deploy`.
4. Create the first login: `npx tsx scripts/seed-super-admin.ts <email> <password> [name]`.
5. `npm run dev` and open http://localhost:3000.

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | `.env` | Supabase Postgres. Locally the session pooler (port 5432) so migrations work; on Vercel the transaction pooler (port 6543, `?pgbouncer=true`). |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` | Supabase publishable key |
| `SUPABASE_SECRET_KEY` | `.env.local` | Supabase secret key (server only, used to create/manage logins) |

All `.env*` files are gitignored. Never commit their values.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` / `npm start` | Production build / run it locally (uses less memory than dev) |
| `npm run lint` | ESLint |
| `npm test` | Self-checks for the money logic: dues schedule, rate history, PDF export |

## Workflow

Change → test locally against the dev database → only then commit. **Pushing to `main`
deploys straight to production on Vercel.** Database migrations are not run by Vercel; apply
them to production manually (see HANDOVER.md).

## Notes

- The server runs in India time (`src/instrumentation.ts`); Vercel itself runs in UTC.
- Admin server actions return `{ error }` instead of throwing (`src/lib/action-result.ts`), so
  forms can show the real message; Next.js hides thrown error text in production.
