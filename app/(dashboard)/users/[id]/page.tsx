import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import Link from "next/link";
import { ArrowLeft, Trash2, Plus, ShieldCheck } from "lucide-react";
import { addUserToProject, removeUserFromProject, updateUser, resetPassword, deleteUser } from "@/app/actions/users";
import { DeleteUserButton } from "@/components/users/delete-user-button";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  const perms = await getPermissions(session.role);
  if (!perms.canManageUsers) redirect("/projects");

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      projectMembers: { include: { project: { select: { id: true, name: true, code: true, status: true } } } },
    },
  });

  if (!user) notFound();

  const allProjects = await prisma.project.findMany({
    where: { status: "active" },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const memberProjectIds = new Set(user.projectMembers.map((m) => m.project.id));
  const availableProjects = allProjects.filter((p) => !memberProjectIds.has(p.id));

  const isSelf = session.userId === id;

  const updateAction = updateUser.bind(null, id);
  const resetAction = resetPassword.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/users" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
        </div>
        {!isSelf && (
          <DeleteUserButton userId={id} userName={user.name} deleteAction={deleteUser} />
        )}
      </div>

      {/* User Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Account Info</h2>
        <form action={updateAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input name="name" defaultValue={user.name} required className="input-base w-full" disabled={isSelf} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select name="role" defaultValue={user.role} className="input-base w-full" disabled={isSelf}>
                <option value="admin">Admin</option>
                <option value="pm">PM</option>
                <option value="member">Member</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select name="isActive" defaultValue={user.isActive ? "true" : "false"} className="input-base w-full" disabled={isSelf}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
          {!isSelf && (
            <button type="submit" className="btn-primary">Save Changes</button>
          )}
        </form>
      </div>

      {/* Reset Password */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Reset Password</h2>
        <form action={resetAction} className="flex gap-3">
          <input
            type="password"
            name="password"
            placeholder="New password (min 6 chars)"
            minLength={6}
            required
            className="input-base flex-1"
          />
          <button type="submit" className="btn-secondary flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Reset
          </button>
        </form>
      </div>

      {/* Project Access */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Project Access</h2>
        {user.role === "admin" || user.role === "pm" ? (
          <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-4">
            Role <strong>{user.role}</strong> — เข้าถึงทุก project โดยอัตโนมัติ
          </p>
        ) : (
          <p className="text-sm text-gray-400 mb-4">Member จะเห็นเฉพาะ project ที่ถูก assign เท่านั้น</p>
        )}

        <div className="space-y-2 mb-4">
          {user.projectMembers.length === 0 && (
            <p className="text-sm text-gray-400 italic">ยังไม่ได้รับสิทธิ์เข้า project ใด</p>
          )}
          {user.projectMembers.map((m) => (
            <div key={m.project.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{m.project.name}</p>
                <p className="text-xs text-gray-400 font-mono">{m.project.code} · {m.project.status}</p>
              </div>
              <form action={async () => { "use server"; await removeUserFromProject(id, m.project.id); }}>
                <button type="submit" className="text-red-500 hover:text-red-700 p-1" title="Remove from project">
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>
          ))}
        </div>

        {availableProjects.length > 0 && (
          <form
            action={async (fd: FormData) => {
              "use server";
              const projectId = fd.get("projectId") as string;
              if (projectId) await addUserToProject(id, projectId);
            }}
            className="flex gap-2"
          >
            <select name="projectId" className="input-base flex-1">
              <option value="">-- เพิ่มสิทธิ์ project --</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
