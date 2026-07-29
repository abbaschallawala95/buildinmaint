"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Building2, LayoutDashboard, Users, Wallet, Receipt, Zap, Settings, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logout } from "@/app/login/actions";

const NAV_BY_ROLE = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/floors", label: "Floors & Flats", icon: Building2 },
    { href: "/admin/users", label: "Members", icon: Users },
    { href: "/admin/payments", label: "Payments", icon: Wallet },
    { href: "/admin/expenses", label: "Expenses", icon: Receipt },
    { href: "/admin/electricity", label: "Electricity Bills", icon: Zap },
    { href: "/admin/audit-log", label: "Audit Log", icon: History },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
  member: [{ href: "/member", label: "Dashboard", icon: LayoutDashboard }],
} as const;

export function NavShell({
  role,
  title,
  userName,
  children,
}: {
  role: keyof typeof NAV_BY_ROLE;
  title: string;
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const links = NAV_BY_ROLE[role];

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Building Maintenance</p>
            <p className="text-xs text-sidebar-foreground/60">{title}</p>
          </div>
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

      <main className="flex-1 overflow-x-hidden bg-muted/30 px-8 py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
