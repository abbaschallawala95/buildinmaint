import { requireRoleOrRedirect } from "@/lib/auth";
import { NavShell } from "@/components/nav-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRoleOrRedirect("SUPER_ADMIN");

  return (
    <NavShell role="admin" title="Super Admin" userName={profile.name}>
      {children}
    </NavShell>
  );
}
