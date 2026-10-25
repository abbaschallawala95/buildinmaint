"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { THEMES } from "@/lib/themes";
import { succeeded } from "@/lib/toast-result";
import { setBuildingTheme } from "./actions";

export function ThemePicker({ buildingId, buildingName, current }: { buildingId: string; buildingName: string; current: string }) {
  const [value, setValue] = useState(current);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          if (await succeeded(setBuildingTheme(formData))) {
            toast.success(`${buildingName} now uses the ${THEMES.find((t) => t.key === value)?.name} theme.`);
            router.refresh();
          }
        });
      }}
    >
      <input type="hidden" name="buildingId" value={buildingId} />
      <select
        name="theme"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={`Theme for ${buildingName}`}
        className="h-9 min-w-40 rounded-md border bg-background px-3 text-sm"
      >
        {THEMES.map((t) => (
          <option key={t.key} value={t.key}>
            {t.name}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={pending || value === current}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
