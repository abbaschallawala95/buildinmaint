import { requireRoleOrRedirect } from "@/lib/auth";
import { NavShell } from "@/components/nav-shell";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRoleOrRedirect("MEMBER");

  return (
    <NavShell role="member" title="My Flat" userName={profile.name}>
      {children}
    </NavShell>
  );
}
