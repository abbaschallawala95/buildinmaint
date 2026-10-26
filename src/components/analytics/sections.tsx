import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MONTH_NAMES, firstShownMonth, type HeadCell, type HeadRow, type Period, type SectionKey } from "@/lib/analytics";
import type { AnalyticsData } from "@/lib/analytics-data";

// Analytics sections shared by /admin/analytics (everything) and shared member reports
// (only the sections the admin picked). Colours come from theme tokens, except the
// income/expense pair, which is a colour-blind-safe pair checked with the dataviz validator.

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const INCOME_BAR = "bg-teal-600";
const EXPENSE_BAR = "bg-rose-600 dark:bg-rose-500";
const rupees = (n: number) => `${n < 0 ? "−" : ""}₹${Math.abs(n).toLocaleString("en-IN")}`;
const label = (p: Period) => `${MONTH_NAMES[p.month - 1]} ${p.year}`;
const previousLabel = (p: Period) => (p.month === 1 ? `December ${p.year - 1}` : MONTH_NAMES[p.month - 2]);

type HrefFor = ((month: number) => string) | null;

function shownMonths(data: AnalyticsData) {
  return data.year.months.slice(firstShownMonth(data.year, data.period.month) - 1);
}

function MonthLink({ hrefFor, month, className, children, ...rest }: { hrefFor: HrefFor; month: number; className?: string; children: React.ReactNode; title?: string; "aria-label"?: string }) {
  if (!hrefFor) return <span className={className} {...rest}>{children}</span>;
  return (
    <Link href={hrefFor(month)} scroll={false} className={className} {...rest}>
      {children}
    </Link>
  );
}

function Change({ value, against, invert = false }: { value: number; against: string; invert?: boolean }) {
  if (value === 0) return null;
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  // For expenses, up is bad (rose); for income (invert), up is good (teal).
  const bad = invert ? !up : up;
  return (
    <span title={`${up ? "Up" : "Down"} ${rupees(Math.abs(value))} vs ${against}`} className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      <Icon className={`size-3.5 ${bad ? "text-rose-600" : "text-teal-600"}`} aria-hidden />
      {rupees(Math.abs(value))}
    </span>
  );
}

export function NewBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
      <Sparkles className="size-3" aria-hidden />
      New
    </span>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className={`size-2.5 rounded-sm ${INCOME_BAR}`} /> Income
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className={`size-2.5 rounded-sm ${EXPENSE_BAR}`} /> Expenses
      </span>
    </div>
  );
}

function SummarySection({ data }: { data: AnalyticsData }) {
  const { year: a, period } = data;
  const net = a.totalIncome - a.totalExpense;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl bg-primary p-5 text-primary-foreground shadow-sm">
        <p className="text-xs font-medium opacity-75">Spent in {period.year}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{rupees(a.totalExpense)}</p>
        <p className="mt-1 text-xs opacity-75">across {a.expenseHeads.filter((h) => h.total > 0).length} expense heads</p>
      </div>
      <Card className="gap-1 py-5">
        <CardContent className="px-5">
          <p className="text-xs font-medium text-muted-foreground">Collected in {period.year}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{rupees(a.totalIncome)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {net >= 0 ? "Saved " : "Short by "}
            {rupees(Math.abs(net))}
          </p>
        </CardContent>
      </Card>
      <Card className="gap-1 py-5">
        <CardContent className="px-5">
          <p className="text-xs font-medium text-muted-foreground">Costliest month</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{a.costliestMonth ? MONTH_NAMES[a.costliestMonth - 1] : "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {a.costliestMonth ? `${rupees(a.months[a.costliestMonth - 1].expense)} spent` : "No expenses yet"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ChartSection({ data, hrefFor }: { data: AnalyticsData; hrefFor: HrefFor }) {
  const shown = shownMonths(data);
  const peak = Math.max(1, ...shown.flatMap((m) => [m.income, m.expense]));
  const selected = data.year.months[data.period.month - 1];
  const tip = (m: (typeof shown)[number]) => `${MONTH_NAMES[m.month - 1]}: income ${rupees(m.income)}, expenses ${rupees(m.expense)}`;
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Money in vs money out</CardTitle>
        <Legend />
      </CardHeader>
      <CardContent>
        <div className="flex h-52 items-end gap-1 border-b border-border sm:gap-2">
          {shown.map((m) => (
            <MonthLink
              key={m.month}
              hrefFor={hrefFor}
              month={m.month}
              title={tip(m)}
              aria-label={tip(m)}
              className={`flex h-full flex-1 items-end justify-center gap-0.5 rounded-t-md px-0.5 pt-6 transition-colors ${hrefFor ? "hover:bg-muted" : ""} ${
                m.month === data.period.month ? "bg-muted" : ""
              }`}
            >
              <span className={`w-full max-w-6 rounded-t ${INCOME_BAR}`} style={{ height: `${(m.income / peak) * 100}%` }} />
              <span className={`w-full max-w-6 rounded-t ${EXPENSE_BAR}`} style={{ height: `${(m.expense / peak) * 100}%` }} />
            </MonthLink>
          ))}
        </div>
        <div className="mt-1.5 flex gap-1 sm:gap-2">
          {shown.map((m) => (
            <span key={m.month} className={`flex-1 text-center text-[11px] ${m.month === data.period.month ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
              {SHORT[m.month - 1]}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {hrefFor ? "Tap a month to select it. " : ""}
          {MONTH_NAMES[data.period.month - 1]}: income {rupees(selected.income)}, expenses {rupees(selected.expense)}.
        </p>
      </CardContent>
    </Card>
  );
}

function FocusSection({ data }: { data: AnalyticsData }) {
  const { period } = data;
  const previous = previousLabel(period);
  const focus = data.year.expenseHeads
    .map((h) => ({ head: h.head, cell: h.cells[period.month - 1] }))
    .filter((f) => f.cell.amount > 0)
    .sort((x, y) => y.cell.amount - x.cell.amount);
  const added = focus.filter((f) => f.cell.isNew);
  const regular = focus.filter((f) => !f.cell.isNew);
  const dropped = data.year.expenseHeads.filter((h) => h.cells[period.month - 1].dropped);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {label(period)} vs {previous}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {focus.length === 0 && <p className="text-sm text-muted-foreground">No expenses this month.</p>}

        {added.length > 0 && (
          <div className="rounded-xl border-2 border-dashed border-primary/40 bg-accent/40 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" aria-hidden />
              Additional this month — nothing was spent on {added.length === 1 ? "this" : "these"} in {previous}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {added.map((f) => (
                <div key={f.head} className="flex items-center justify-between rounded-lg bg-card px-3 py-2.5 shadow-sm">
                  <span className="text-sm font-medium">{f.head}</span>
                  <span className="font-semibold">{rupees(f.cell.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {regular.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {regular.map((f) => (
              <div key={f.head} className="rounded-xl border bg-card p-4">
                <p className="text-sm text-muted-foreground">{f.head}</p>
                <p className="mt-1 text-xl font-semibold">{rupees(f.cell.amount)}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  {f.cell.change === 0 ? (
                    `Same as ${previous}`
                  ) : (
                    <>
                      <Change value={f.cell.change} against={previous} />
                      {f.cell.change > 0 ? "more" : "less"} than {previous} ({rupees(f.cell.amount - f.cell.change)})
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}

        {dropped.length > 0 && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Not this month:</span>{" "}
            {dropped.map((h) => `${h.head} (${rupees(-h.cells[period.month - 1].change)} in ${previous})`).join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CompareSection({ data }: { data: AnalyticsData }) {
  const { comparison, compare, period } = data;
  if (!comparison || !compare) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compare two months</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Choose a month in &ldquo;Compare with&rdquo; to see the difference for every head.</p>
        </CardContent>
      </Card>
    );
  }
  const a = label(compare);
  const b = label(period);
  const groups = (["expense", "income"] as const).map((kind) => ({
    kind,
    rows: comparison.rows.filter((r) => r.kind === kind),
    total: comparison.totals[kind],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {b} vs {a}
        </CardTitle>
        <p className="text-xs text-muted-foreground">Difference = {b} − {a}.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {groups.map((g) => (
            <div key={g.kind} className="col-span-1 rounded-xl border bg-card p-4 sm:col-span-2">
              <p className="text-xs text-muted-foreground">{g.kind === "expense" ? "Expenses" : "Income"}</p>
              <p className="mt-1 text-sm">
                {rupees(g.total.a)} → <span className="text-lg font-semibold">{rupees(g.total.b)}</span>
              </p>
              <Change value={g.total.b - g.total.a} against={a} invert={g.kind === "income"} />
            </div>
          ))}
        </div>
        {groups.map(
          (g) =>
            g.rows.length > 0 && (
              <div key={g.kind} className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">{g.kind === "expense" ? "Expense" : "Income"}</th>
                      <th className="px-3 py-2 text-right font-medium">{a}</th>
                      <th className="px-3 py-2 text-right font-medium">{b}</th>
                      <th className="px-3 py-2 text-right font-medium">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => (
                      <tr key={r.head} className="border-t">
                        <td className="px-3 py-2.5 font-medium">{r.head}</td>
                        <td className="px-3 py-2.5 text-right">{r.a ? rupees(r.a) : "—"}</td>
                        <td className="px-3 py-2.5 text-right">{r.b ? rupees(r.b) : "—"}</td>
                        <td className="px-3 py-2.5 text-right">
                          {r.a === 0 ? (
                            <NewBadge />
                          ) : r.b === 0 ? (
                            <span className="text-xs text-muted-foreground">Not in {b}</span>
                          ) : r.diff === 0 ? (
                            <span className="text-xs text-muted-foreground">Same</span>
                          ) : (
                            <Change value={r.diff} against={a} invert={g.kind === "income"} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ),
        )}
      </CardContent>
    </Card>
  );
}

function HeadGridSection({ data, kind, hrefFor }: { data: AnalyticsData; kind: "expense" | "income"; hrefFor: HrefFor }) {
  const heads: HeadRow[] = kind === "expense" ? data.year.expenseHeads : data.year.incomeHeads;
  const shown = shownMonths(data);
  const from = shown[0].month - 1;
  const selected = data.period.month;
  const noun = kind === "expense" ? "expense" : "income";
  const changeOf = (c: HeadCell) => (c.isNew ? <NewBadge /> : c.dropped ? null : <Change value={c.change} against="the month before" invert={kind === "income"} />);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{kind === "expense" ? "Every expense, every month" : "Every income, every month"}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Arrows show the change from the month before. <NewBadge /> = nothing {kind === "expense" ? "spent on" : "received from"} it the month before.
        </p>
      </CardHeader>
      <CardContent>
        {heads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No {noun} in {data.period.year} yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium text-muted-foreground">{kind === "expense" ? "Expense" : "Income"}</th>
                  {shown.map((m) => (
                    <th key={m.month} className={`min-w-20 px-3 py-2 text-right font-medium ${m.month === selected ? "rounded-t-lg bg-muted text-foreground" : "text-muted-foreground"}`}>
                      <MonthLink hrefFor={hrefFor} month={m.month} className={hrefFor ? "hover:underline" : undefined}>
                        {SHORT[m.month - 1]}
                      </MonthLink>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {heads.map((h) => (
                  <tr key={h.head}>
                    <th className="sticky left-0 z-10 border-t bg-card px-3 py-2.5 text-left font-medium whitespace-nowrap">{h.head}</th>
                    {h.cells.slice(from).map((c) => (
                      <td key={c.month} className={`border-t px-3 py-2.5 text-right align-top ${c.month === selected ? "bg-muted" : ""}`}>
                        {c.amount === 0 ? (
                          <span className="text-muted-foreground/50">—</span>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-medium">{rupees(c.amount)}</span>
                            {changeOf(c)}
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="border-t px-3 py-2.5 text-right font-semibold">{rupees(h.total)}</td>
                  </tr>
                ))}
                <tr>
                  <th className="sticky left-0 z-10 border-t-2 bg-card px-3 py-2.5 text-left font-semibold">{kind === "expense" ? "All expenses" : "All income"}</th>
                  {shown.map((m) => (
                    <td key={m.month} className={`border-t-2 px-3 py-2.5 text-right font-semibold ${m.month === selected ? "bg-muted" : ""}`}>
                      {rupees(m[kind])}
                    </td>
                  ))}
                  <td className="border-t-2 px-3 py-2.5 text-right font-semibold">{rupees(kind === "expense" ? data.year.totalExpense : data.year.totalIncome)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CollectionSection({ data, hrefFor, showFlats }: { data: AnalyticsData; hrefFor: HrefFor; showFlats: boolean }) {
  const from = shownMonths(data)[0].month - 1;
  const months = data.collection.slice(from);
  const pct = (c: { expected: number; collected: number }) => (c.expected > 0 ? Math.min(100, Math.round((c.collected / c.expected) * 100)) : 0);
  const selected = data.collection[data.period.month - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance collection</CardTitle>
        <p className="text-xs text-muted-foreground">Share of each month&apos;s maintenance that has been paid.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {months.map((c) => (
            <MonthLink
              key={c.month}
              hrefFor={hrefFor}
              month={c.month}
              title={`${MONTH_NAMES[c.month - 1]}: ${rupees(c.collected)} of ${rupees(c.expected)}`}
              className={`rounded-xl border p-3 text-center transition-colors ${c.month === data.period.month ? "border-primary bg-muted" : hrefFor ? "hover:bg-muted" : ""}`}
            >
              <span className="block text-[11px] text-muted-foreground">{SHORT[c.month - 1]}</span>
              <span className="block text-lg font-semibold">{pct(c)}%</span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-border">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${pct(c)}%` }} />
              </span>
            </MonthLink>
          ))}
        </div>
        <p className="text-sm">
          <span className="font-semibold">{MONTH_NAMES[data.period.month - 1]}:</span> {rupees(selected.collected)} collected of {rupees(selected.expected)} ·{" "}
          {selected.behind.length === 0 ? "every flat has paid" : `${selected.behind.length} flat${selected.behind.length === 1 ? "" : "s"} still to pay`}
        </p>
        {showFlats && selected.behind.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.behind.map((f) => (
              <span key={f} className="rounded-full bg-secondary px-2.5 py-1 font-mono text-xs text-secondary-foreground">
                {f}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Renders the chosen sections in their canonical order.
export function AnalyticsSections({
  data,
  sections,
  hrefFor = null,
  showFlats = false,
}: {
  data: AnalyticsData;
  sections: readonly SectionKey[];
  hrefFor?: HrefFor;
  showFlats?: boolean;
}) {
  const on = (k: SectionKey) => sections.includes(k);
  return (
    <div className="space-y-6">
      {on("summary") && <SummarySection data={data} />}
      {on("chart") && <ChartSection data={data} hrefFor={hrefFor} />}
      {on("focus") && <FocusSection data={data} />}
      {on("compare") && <CompareSection data={data} />}
      {on("expenses") && <HeadGridSection data={data} kind="expense" hrefFor={hrefFor} />}
      {on("income") && <HeadGridSection data={data} kind="income" hrefFor={hrefFor} />}
      {on("collection") && <CollectionSection data={data} hrefFor={hrefFor} showFlats={showFlats} />}
    </div>
  );
}
