import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MONTH_NAMES, parseSections } from "@/lib/analytics";
import { getAnalytics } from "@/lib/analytics-data";
import { AnalyticsSections } from "@/components/analytics/sections";

// A report an admin shared: only its sections, live numbers, never individual flats.
export default async function MemberSharedAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile?.buildingId || !z.string().uuid().safeParse(id).success) notFound();

  const report = await prisma.sharedAnalytics.findFirst({ where: { id, buildingId: profile.buildingId } });
  if (!report) notFound();

  const period = { year: report.year, month: report.month };
  const compare = report.compareYear && report.compareMonth ? { year: report.compareYear, month: report.compareMonth } : null;
  const [data, building] = await Promise.all([
    getAnalytics(profile.buildingId, period, compare),
    prisma.building.findUnique({ where: { id: profile.buildingId }, select: { name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/member" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Analytics · {MONTH_NAMES[report.month - 1]} {report.year}
        </h1>
        <p className="text-sm text-muted-foreground">
          {building?.name} · Shared by {report.sharedByName} on {report.sharedAt.toLocaleDateString("en-IN")}
        </p>
      </div>
      <AnalyticsSections data={data} sections={parseSections(report.sections)} />
    </div>
  );
}
