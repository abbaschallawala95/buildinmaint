"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Building2, LayoutDashboard, Users, Wallet, Receipt, Zap, Settings, History, Menu, X, Sparkles, PiggyBank, HandCoins, FileDown, Landmark, Palette, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logout } from "@/app/login/actions";
import { selectBuilding } from "@/app/admin/buildings/actions";
import { themeOf } from "@/lib/themes";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_BY_ROLE = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/floors", label: "Floors & Flats", icon: Building2 },
    { href: "/admin/users", label: "Members", icon: Users },
    { href: "/admin/payments", label: "Payments", icon: Wallet },
    { href: "/admin/additional-income", label: "Additional Income", icon: HandCoins },
    { href: "/admin/expenses", label: "Expenses", icon: Receipt },
    { href: "/admin/electricity", label: "Electricity Bills", icon: Zap },
    { href: "/admin/cleaners", label: "Cleaners", icon: Sparkles },
    { href: "/admin/export", label: "Export", icon: FileDown },
    { href: "/admin/audit-log", label: "Audit Log", icon: History },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
  member: [{ href: "/member", label: "Dashboard", icon: LayoutDashboard }],
} as const;

export function NavShell({
  role,
  title,
  userName,
  showMonthlyData,
  isSuperAdmin,
  buildings,
  selectedBuildingId,
  skin,
  children,
}: {
  skin: string; // building theme key (src/lib/themes.ts); unknown keys fall back to the default
  role: keyof typeof NAV_BY_ROLE;
  title: string;
  userName: string;
  showMonthlyData?: boolean;
  isSuperAdmin?: boolean;
  buildings?: { id: string; name: string }[];
  selectedBuildingId?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const links: { href: string; label: string; icon: LucideIcon }[] =
    role === "member" && showMonthlyData
      ? [...NAV_BY_ROLE.member, { href: "/member/monthly-data", label: "Monthly Data", icon: PiggyBank }]
      : role === "admin" && isSuperAdmin
        ? [
            ...NAV_BY_ROLE.admin,
            { href: "/admin/buildings", label: "Buildings", icon: Landmark },
            { href: "/admin/themes", label: "Themes", icon: Palette },
          ]
        : [...NAV_BY_ROLE[role]];
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const theme = themeOf(skin);
  // Bento: on desktop the sidebar shrinks to an icon-only rail; the phone drawer stays full width.
  const rail = (cls: string) => (theme.rail ? cls : "");

  // Dialogs, dropdowns and toasts render outside this wrapper (in <body>), so mirror the
  // building's theme onto <html> too. Undo on leave so the login page keeps the default look.
  useEffect(() => {
    document.documentElement.dataset.skin = theme.key;
  }, [theme.key]);
  // Only on leaving the app shell — clearing "dark" on every theme change would drop the user's choice.
  useEffect(() => {
    const html = document.documentElement;
    return () => {
      delete html.dataset.skin;
      html.classList.remove("dark");
    };
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      forcedTheme={theme.darkMode ? undefined : "light"}
    >
    <div data-skin={theme.key} className="flex min-h-screen bg-background font-sans text-foreground">
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 ${rail("md:w-24")} -translate-x-full flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className={`flex items-center gap-2 px-5 py-5 ${rail("md:justify-center md:px-0")}`}>
          <div className={`flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground ${rail("md:size-11.5 md:rounded-2xl")}`}>
            <Building2 className="size-5" />
          </div>
          <div className={rail("md:hidden")}>
            <p className="text-sm font-semibold leading-tight">Build Maintain</p>
            <p className="text-xs text-sidebar-foreground/60">{title}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground md:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        {isSuperAdmin && buildings && buildings.length > 0 && (
          <form ref={formRef} action={selectBuilding} className="px-3 pb-2">
            <label className={`px-1 text-xs text-sidebar-foreground/60 ${rail("md:sr-only")}`}>Building</label>
            <select
              name="buildingId"
              defaultValue={selectedBuildingId}
              onChange={() => formRef.current?.requestSubmit()}
              className="mt-1 h-9 w-full rounded-md border border-sidebar-border bg-sidebar px-2 text-sm text-sidebar-foreground"
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </form>
        )}

        <nav className="flex-1 space-y-1 px-3 py-2">
          {links.map((l) => {
            // Sub-pages (e.g. /admin/payments/<flat>) keep their section highlighted; the
            // dashboard roots only match exactly, or they'd light up on every page.
            const isRoot = l.href === "/admin" || l.href === "/member";
            const active = pathname === l.href || (!isRoot && pathname.startsWith(`${l.href}/`));
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                title={theme.rail ? l.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${rail("md:mx-auto md:size-13 md:justify-center md:rounded-[18px] md:px-0")} ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="size-4" />
                <span className={rail("md:sr-only")}>{l.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className={`flex items-center gap-2 rounded-lg px-2 py-2 ${rail("md:justify-center")}`} title={theme.rail ? userName : undefined}>
            <Avatar className="size-8">
              <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-accent-foreground">
                {userName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className={`flex-1 truncate text-sm ${rail("md:sr-only")}`}>{userName}</span>
          </div>
          <form action={logout}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              title={theme.rail ? "Sign out" : undefined}
              className={`mt-1 w-full justify-start gap-2 ${rail("md:justify-center")} text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground`}
            >
              <LogOut className="size-4" />
              <span className={rail("md:sr-only")}>Sign out</span>
            </Button>
          </form>
          {theme.darkMode && <ThemeToggle />}
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col overflow-x-hidden">
        <header className="flex items-center gap-3 border-b bg-background px-4 py-3 md:hidden">
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <p className="text-sm font-semibold">{title}</p>
        </header>

        <main className="flex-1 bg-muted/30 px-4 py-4 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
    </ThemeProvider>
  );
}
