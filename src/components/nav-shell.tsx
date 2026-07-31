"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Building2, LayoutDashboard, Users, Wallet, Receipt, Zap, Settings, History, Menu, X, Sparkles, PiggyBank, HandCoins } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logout } from "@/app/login/actions";

const NAV_BY_ROLE = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/floors", label: "Floors & Flats", icon: Building2 },
    { href: "/admin/users", label: "Members", icon: Users },
    { href: "/admin/payments", label: "Payments", icon: Wallet },
    { href: "/admin/additional-income", label: "Additional Income", icon: HandCoins },
    { href: "/admin/expenses", label: "Expenses", icon: Receipt },
    { href: "/admin/electricity", label: "Electricity Bills", icon: Zap },
    { href: "/admin/cleaners", label: "Cleaners", icon: Sparkles },
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
  children,
}: {
  role: keyof typeof NAV_BY_ROLE;
  title: string;
  userName: string;
  showMonthlyData?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const links: { href: string; label: string; icon: LucideIcon }[] =
    role === "member" && showMonthlyData
      ? [...NAV_BY_ROLE.member, { href: "/member/monthly-data", label: "Monthly Data", icon: PiggyBank }]
      : [...NAV_BY_ROLE[role]];
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="flex min-h-screen">
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 -translate-x-full flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Building Maintenance</p>
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

        <nav className="flex-1 space-y-1 px-3 py-2">
          {links.map((l) => {
            const active = pathname === l.href;
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="size-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 rounded-lg px-2 py-2">
            <Avatar className="size-8">
              <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-accent-foreground">
                {userName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-sm">{userName}</span>
          </div>
          <form action={logout}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="mt-1 w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
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
  );
}
