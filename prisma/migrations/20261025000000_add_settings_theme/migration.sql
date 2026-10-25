-- Per-building theme key (see src/lib/themes.ts). Additive; existing buildings get the default.
ALTER TABLE "settings" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'indigo';
