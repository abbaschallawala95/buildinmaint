"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const selectClass = "h-9 rounded-md border bg-background px-3 text-sm";

// Month list depends on the chosen year: the current year only lists months up to today.
export function MonthYearPicker({
  month,
  year,
  thisMonth,
  thisYear,
  firstYear,
}: {
  month: number;
  year: number;
  thisMonth: number;
  thisYear: number;
  firstYear: number;
}) {
  const [selectedYear, setSelectedYear] = useState(year);
  const [selectedMonth, setSelectedMonth] = useState(month);
  const lastMonth = selectedYear === thisYear ? thisMonth : 12;
  const years = Array.from({ length: thisYear - firstYear + 1 }, (_, i) => firstYear + i);

  return (
    <form method="get" className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Month</label>
        <select
          name="month"
          value={Math.min(selectedMonth, lastMonth)}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className={selectClass}
        >
          {MONTH_NAMES.slice(0, lastMonth).map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Year</label>
        <select
          name="year"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className={selectClass}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="outline">
        View
      </Button>
    </form>
  );
}
