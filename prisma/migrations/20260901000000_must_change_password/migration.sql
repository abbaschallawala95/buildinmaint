-- Default false so existing accounts are unaffected; the create/reset-password actions
-- explicitly set this true for newly created or password-reset profiles.
ALTER TABLE "profiles" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
