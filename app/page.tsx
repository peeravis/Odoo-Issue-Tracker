import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPermissions } from "@/lib/permissions";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  const perms = await getPermissions(session.role);
  redirect(perms.canAccessDashboard ? "/dashboard" : "/projects");
}
