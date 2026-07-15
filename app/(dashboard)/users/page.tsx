import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { FadeUp } from "@/components/ui/motion";
import { CheckCircle, XCircle, Download } from "lucide-react";
import { CreateUserDialog } from "@/components/users/create-user-dialog";
import { ImportUsersButton } from "@/components/users/import-users-button";
import { EditUserDialog } from "@/components/users/edit-user-dialog";

interface SearchParams {
  search?: string;
  role?: string;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const perms = await getPermissions(session.role);
  if (!perms.canManageUsers) redirect("/projects");

  const sp = await searchParams;

  const where: Record<string, unknown> = {};
  if (sp.search) {
    where.OR = [
      { name: { contains: sp.search, mode: "insensitive" } },
      { email: { contains: sp.search, mode: "insensitive" } },
    ];
  }
  if (sp.role) {
    where.role = sp.role;
  }

  const [users, allProjects] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: { projectMembers: { include: { project: { select: { id: true, name: true, code: true } } } } },
    }),
    prisma.project.findMany({
      where: { status: "active" },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const allRoles = ["admin", "pm", "member", "rnao", "co", "gl"];

  return (
    <div className="space-y-5">
      <FadeUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">User Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">{users.length} users</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/api/users/export" className="btn-secondary inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </a>
            <ImportUsersButton />
            <CreateUserDialog />
          </div>
        </div>
      </FadeUp>

      {/* Search & Filter */}
      <FadeUp delay={0.04}>
        <form method="GET" className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">ค้นหา ชื่อ / Email</label>
              <input
                name="search"
                defaultValue={sp.search}
                placeholder="พิมพ์ชื่อหรืออีเมล..."
                className="input-base w-full"
              />
            </div>
            <div className="w-44">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Role</label>
              <select name="role" defaultValue={sp.role ?? ""} className="input-base w-full">
                <option value="">ทุก Role</option>
                {allRoles.map((r) => (
                  <option key={r} value={r} className="uppercase">
                    {r.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">ค้นหา</button>
              {(sp.search || sp.role) && (
                <a href="/users" className="btn-secondary">ล้าง</a>
              )}
            </div>
          </div>
        </form>
      </FadeUp>

      {/* Import format hint */}
      <FadeUp delay={0.06}>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/60 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">รูปแบบ Excel สำหรับ Import</p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            คอลัมน์: <strong>A=Name</strong> · <strong>B=Email</strong> · <strong>C=Password</strong> (เว้นว่างถ้าไม่เปลี่ยน) ·{" "}
            <strong>D=Role</strong> (admin/pm/member/rnao/co/gl) · <strong>E=Status</strong> (active/inactive) ·{" "}
            <strong>F=Projects</strong> (code คั่นด้วยคอมมา เช่น DEMO,ODOO) · แถวแรก=header, แถว 2=คำอธิบาย, แถว 3+=ข้อมูล
          </p>
        </div>
      </FadeUp>

      <FadeUp delay={0.08}>
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700/60">
                <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">ชื่อ / Email</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Role</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Projects</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors duration-150">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        label={user.role.toUpperCase()}
                        className={
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            : user.role === "pm"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : user.role === "rnao" || user.role === "co" || user.role === "gl"
                            ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        }
                      />
                      {(user.extraRoles ?? []).map((r) => (
                        <Badge
                          key={r}
                          label={r.toUpperCase()}
                          className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {user.isActive ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                        <CheckCircle className="h-4 w-4" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                        <XCircle className="h-4 w-4" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {user.role === "admin" || user.role === "pm" ? (
                      <span className="text-xs text-indigo-500">ทุก project</span>
                    ) : user.projectMembers.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">ไม่มี</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.projectMembers.slice(0, 3).map((m) => (
                          <span key={m.project.id} className="text-xs px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded font-mono">
                            {m.project.code}
                          </span>
                        ))}
                        {user.projectMembers.length > 3 && (
                          <span className="text-xs text-gray-400">+{user.projectMembers.length - 3}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <EditUserDialog
                      user={{ ...user, extraRoles: user.extraRoles ?? [] }}
                      allProjects={allProjects}
                      isSelf={session.userId === user.id}
                    />
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                    ไม่พบ user ที่ค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </FadeUp>
    </div>
  );
}
