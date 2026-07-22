import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getConfigs } from "@/lib/config";
import { getPermissions } from "@/lib/permissions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [cfg, perms] = await Promise.all([
    getConfigs(["app.name", "app.logoUrl"]),
    getPermissions(session.role),
  ]);

  return (
    <DashboardShell
      userRole={session.role}
      userName={session.name}
      appName={cfg["app.name"]}
      logoUrl={cfg["app.logoUrl"]}
      permissions={perms}
    >
      {children}
    </DashboardShell>
  );
}
