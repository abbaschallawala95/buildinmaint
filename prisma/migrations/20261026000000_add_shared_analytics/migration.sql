-- Analytics months shared with members. Additive; nothing existing changes.
CREATE TABLE "shared_analytics" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "sections" TEXT[],
    "compareYear" INTEGER,
    "compareMonth" INTEGER,
    "sharedByName" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_analytics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shared_analytics_buildingId_year_month_key" ON "shared_analytics"("buildingId", "year", "month");

ALTER TABLE "shared_analytics" ADD CONSTRAINT "shared_analytics_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same as every other table: no access through Supabase's public API, only via Prisma.
ALTER TABLE "shared_analytics" ENABLE ROW LEVEL SECURITY;
