-- Supabase flagged every public table as "publicly accessible": Row-Level Security was
-- disabled, so anyone with the project URL could read/write/delete via the auto-generated
-- PostgREST API using the anon/authenticated keys. This app never uses that API for data
-- (all queries go through Prisma, server-side, over DATABASE_URL, authorized in app code
-- via requireRole/requireAdminContext) — the Prisma connection is the "postgres" role,
-- which owns these tables and has BYPASSRLS, so enabling RLS here has no effect on the
-- app itself. No policies are added on purpose: the intent is to deny the PostgREST path
-- entirely, not to selectively allow it.
ALTER TABLE "buildings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "floors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flat_maintenance_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "additional_charges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "electricity_bills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cleaners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cleaner_salary_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cleaner_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cleaner_payment_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
