-- Prisma's own migration-history table also lives in the public schema and was flagged
-- by the same Supabase advisory. Same reasoning as the previous migration: this table is
-- never accessed via PostgREST/anon keys, only by Prisma CLI over DATABASE_URL as the
-- postgres role (which has BYPASSRLS), so enabling RLS here is a no-op for the app/tooling
-- and simply closes the exposed REST path.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
