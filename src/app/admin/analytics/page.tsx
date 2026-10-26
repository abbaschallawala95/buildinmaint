import Link from "next/link";
import { FileDown, FileSpreadsheet, SlidersHorizontal } from "lucide-react";
import { requireAdminContext } from "@/lib/building-context";
import { prisma } from "@/lib/prisma";
import { MONTH_NAMES, SECTIONS, parsePeriod, parseSections, periodOptions, type SectionKey } from "@/lib/analytics";
import { FIRST_YEAR, getAnalytics } from "@/lib/analytics-data";
import { AnalyticsSections } from "@/components/analytics/sections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ShareButton, UnshareButton } from "./share-buttons";

const selectClass = "h-9 rounded-md border bg-background px-3 text-sm";
const sectionLabel = (k: string) => SECTIONS.find((s) => s.key === k)?.label ?? k;
const ym = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

// Query string for a given config; the page, month links, exports and "Open" all use it.
function query(period: string, cmp: string, sections: readonly string[]) {
  const q = new URLSearchParams({ period });
  if (cmp) q.set("cmp", cmp);
  if (sections.length < SECTIONS.length) sections.forEach((s) => q.append("s", s));
  return q.toString();
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; cmp?: string; s?: string | string[] }>;
}) {
  const { buildingId } = await requireAdminContext();
  const params = await searchParams;
  const now = new Date();
  const period = parsePeriod(params.period, FIRST_YEAR) ?? { year: now.getFullYear(), month: now.getMonth() + 1 };
  const compare = parsePeriod(params.cmp, FIRST_YEAR);
  const sections: SectionKey[] = parseSections([params.s ?? []].flat());
  const periodValue = ym(period.year, period.month);
  const cmpValue = compare ? ym(compare.year, compare.month) : "";
  const options = periodOptions(FIRST_YEAR);

  const [data, shared, building] = await Promise.all([
    getAnalytics(buildingId, period, compare),
    prisma.sharedAnalytics.findMany({ where: { buildingId }, orderBy: [{ year: "desc" }, { month: "desc" }] }),
    prisma.building.findUnique({ where: { id: buildingId }, select: { name: true } }),
  ]);
  const thisShare = shared.find((s) => s.year === period.year && s.month === period.month);
  const periodLabel = `${MONTH_NAMES[period.month - 1]} ${period.year}`;
  const qs = query(periodValue, cmpValue, sections);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {building?.name} · {periodLabel}
            {compare && ` compared with ${MONTH_NAMES[compare.month - 1]} ${compare.year}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/admin/export/analytics?${qs}&format=pdf`} className={buttonVariants({ variant: "outline" })}>
            <FileDown className="size-4" aria-hidden /> PDF
          </a>
          <a href={`/api/admin/export/analytics?${qs}&format=excel`} className={buttonVariants({ variant: "outline" })}>
            <FileSpreadsheet className="size-4" aria-hidden /> Excel
          </a>
          <ShareButton period={periodValue} cmp={cmpValue} sections={sections} label={periodLabel} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="size-4" aria-hidden /> Customise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label htmlFor="period" className="text-xs text-muted-foreground">Month</label>
                <select id="period" name="period" defaultValue={periodValue} className={selectClass}>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="cmp" className="text-xs text-muted-foreground">Compare with</label>
                <select id="cmp" name="cmp" defaultValue={cmpValue} className={selectClass}>
                  <option value="">None</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" variant="outline">Apply</Button>
            </div>
            <fieldset>
              <legend className="mb-2 text-xs text-muted-foreground">Sections to show, export and share</legend>
              <div className="flex flex-wrap gap-2">
                {SECTIONS.map((s) => (
                  <label
                    key={s.key}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
                  >
                    <input type="checkbox" name="s" value={s.key} defaultChecked={sections.includes(s.key)} className="sr-only" />
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </form>
        </CardContent>
      </Card>

      <AnalyticsSections
        data={data}
        sections={sections}
        showFlats
        hrefFor={(m) => `/admin/analytics?${query(ym(period.year, m), cmpValue, sections)}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Shared with members</CardTitle>
          <p className="text-xs text-muted-foreground">
            Members see these on their dashboard with live numbers. Flats that still owe are never shown to members.
            {thisShare ? ` ${periodLabel} is shared — sharing again replaces its sections.` : ""}
          </p>
        </CardHeader>
        <CardContent>
          {shared.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing shared yet. Pick a month and sections above, then press &ldquo;Share with members&rdquo;.</p>
          ) : (
            <ul className="divide-y">
              {shared.map((s) => {
                const name = `${MONTH_NAMES[s.month - 1]} ${s.year}`;
                const cmp = s.compareYear && s.compareMonth ? ym(s.compareYear, s.compareMonth) : "";
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {name}
                        {cmp && <span className="text-muted-foreground"> vs {MONTH_NAMES[s.compareMonth! - 1]} {s.compareYear}</span>}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {s.sections.map((k) => (
                          <Badge key={k} variant="secondary">{sectionLabel(k)}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Shared by {s.sharedByName} on {s.sharedAt.toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/admin/analytics?${query(ym(s.year, s.month), cmp, s.sections)}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        Open
                      </Link>
                      <UnshareButton id={s.id} label={name} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
