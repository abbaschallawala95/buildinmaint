import { redirect } from "next/navigation";
import { requireRoleOrRedirect } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { NavShell } from "@/components/nav-shell";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRoleOrRedirect("MEMBER");
  if (!profile.buildingId) redirect("/login");
  const settings = await getSettings(profile.buildingId);

  return (
    <NavShell role="member" title="My Flat" userName={profile.name} showMonthlyData={settings.allowMembersViewFinancials}>
      {children}
    </NavShell>
  );
}
