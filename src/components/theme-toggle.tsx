"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

const MODES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Monitor },
] as const;

// Per-user Light / Dark / Auto switch; next-themes remembers the choice on this device.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The saved choice is only known in the browser; render neutral until mounted to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard next-themes mount guard
  useEffect(() => setMounted(true), []);

  return (
    <div role="group" aria-label="Colour mode" className="mt-1 flex rounded-lg bg-sidebar-accent/40 p-0.5">
      {MODES.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-sidebar text-sidebar-foreground shadow-sm"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
