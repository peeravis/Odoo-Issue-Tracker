import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getConfigs } from "@/lib/config";
import { getPermissions } from "@/lib/permissions";
import { LayoutClient } from "@/components/layout/layout-client";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [cfg, perms] = await Promise.all([
    getConfigs(["app.name", "app.logoUrl"]),
    getPermissions(session.role),
  ]);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950">
      <LayoutClient
        userRole={session.role}
        userName={session.name}
        appName={cfg["app.name"]}
        logoUrl={cfg["app.logoUrl"]}
        canAccessDashboard={perms.canAccessDashboard}
        canManageMasterData={perms.canManageMasterData}
        canManageUsers={perms.canManageUsers}
        canAccessConfig={perms.canAccessConfig}
        canManageProjects={perms.canManageProjects}
      >
        {children}
      </LayoutClient>
    </div>
  );
}
