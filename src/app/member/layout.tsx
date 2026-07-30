import { LayoutDashboard, PiggyBank } from "lucide-react";
import { requireRoleOrRedirect } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { NavShell } from "@/components/nav-shell";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRoleOrRedirect("MEMBER");
  const settings = await getSettings();

  const links = [
    { href: "/member", label: "Dashboard", icon: LayoutDashboard },
    ...(settings.allowMembersViewFinancials
      ? [{ href: "/member/monthly-data", label: "Monthly Data", icon: PiggyBank }]
      : []),
  ];

  return (
    <NavShell role="member" title="My Flat" userName={profile.name} links={links}>
      {children}
    </NavShell>
  );
}
