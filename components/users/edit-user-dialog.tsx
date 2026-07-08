"use client";

import { useState, useTransition, useRef } from "react";
import { Pencil, X, Trash2, KeyRound } from "lucide-react";
import { updateUser, deleteUser, setUserProjects, resetPassword } from "@/app/actions/users";
import { useRouter } from "next/navigation";
import { ModalOverlay } from "@/components/ui/motion";

type Project = { id: string; name: string; code: string };

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  extraRoles: string[];
  isActive: boolean;
  projectMembers: { project: Project }[];
};

export function EditUserDialog({
  user,
  allProjects,
  isSelf,
}: {
  user: User;
  allProjects: Project[];
  isSelf: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set(user.projectMembers.map((m) => m.project.id))
  );
  const [role, setRole] = useState(user.role);
  const [selectedExtraRoles, setSelectedExtraRoles] = useState<Set<string>>(
    new Set(user.extraRoles)
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const newPwRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    setSelectedProjects(new Set(user.projectMembers.map((m) => m.project.id)));
    setRole(user.role);
    setSelectedExtraRoles(new Set(user.extraRoles));
    setConfirmDelete(false);
    setShowResetPw(false);
    setResetMsg(null);
    setOpen(true);
  };

  const handleResetPassword = async (fd: FormData) => {
    startTransition(async () => {
      try {
        await resetPassword(user.id, fd);
        setResetMsg("เปลี่ยน password สำเร็จ");
        setShowResetPw(false);
        if (newPwRef.current) newPwRef.current.value = "";
      } catch (e) {
        setResetMsg(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      }
    });
  };

  const toggleExtraRole = (r: string) => {
    setSelectedExtraRoles((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  };

  const memberRoles = ["member", "rnao", "co", "gl"];

  const handleSubmit = async (fd: FormData) => {
    startTransition(async () => {
      await updateUser(user.id, fd);
      if (memberRoles.includes(role)) {
        await setUserProjects(user.id, Array.from(selectedProjects));
      }
      setOpen(false);
      router.refresh();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteUser(user.id);
      setOpen(false);
      router.refresh();
    });
  };

  const toggleProject = (id: string) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 transition-colors"
        title="Edit user"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit
      </button>

      <ModalOverlay open={open} onClose={() => setOpen(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg mx-auto shadow-2xl max-h-[88vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 flex-shrink-0">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Edit User</h2>
                <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              <form id="edit-user-form" action={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อ <span className="text-red-500">*</span></label>
                    <input
                      name="name"
                      defaultValue={user.name}
                      required
                      disabled={isSelf}
                      className="input-base w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                    <select
                      name="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={isSelf}
                      className="input-base w-full"
                    >
                      <option value="admin">Admin</option>
                      <option value="pm">PM</option>
                      <option value="member">Member</option>
                      <option value="rnao">RNAO</option>
                      <option value="co">CO</option>
                      <option value="gl">GL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <select name="isActive" defaultValue={user.isActive ? "true" : "false"} disabled={isSelf} className="input-base w-full">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Assignable Roles */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assignable Roles
                  </label>
                  <div className="flex flex-wrap gap-4">
                    {(["vendor", "aspd"] as const).map((r) => (
                      <label key={r} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          name="extraRoles"
                          value={r}
                          checked={selectedExtraRoles.has(r)}
                          onChange={() => toggleExtraRole(r)}
                          className="rounded border-gray-300 dark:border-gray-600 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 uppercase tracking-wide">{r}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">ผู้ใช้ที่มี role นี้จะปรากฎใน Assignee dropdown</p>
                </div>

                {/* Project Access */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Access
                  </label>
                  {!memberRoles.includes(role) ? (
                    <p className="text-xs text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                      Role <strong className="uppercase">{role}</strong> เข้าถึงทุก project อัตโนมัติ
                    </p>
                  ) : (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto">
                      {allProjects.length === 0 && (
                        <p className="px-3 py-2 text-xs text-gray-400">ยังไม่มี project</p>
                      )}
                      {allProjects.map((p) => (
                        <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedProjects.has(p.id)}
                            onChange={() => toggleProject(p.id)}
                            className="rounded border-gray-300 dark:border-gray-600 text-indigo-600"
                          />
                          <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{p.name}</span>
                          <span className="text-xs font-mono text-gray-400">{p.code}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </form>

              {/* Reset Password */}
              {!isSelf && (
                <div className="px-6 pb-5 border-t border-gray-100 dark:border-gray-700/60 pt-4">
                  {resetMsg && (
                    <p className={`text-xs mb-2 ${resetMsg.includes("สำเร็จ") ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                      {resetMsg}
                    </p>
                  )}
                  {showResetPw ? (
                    <form action={handleResetPassword} className="space-y-3">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5" /> Reset Password
                      </p>
                      <div className="flex gap-2">
                        <input
                          ref={newPwRef}
                          name="password"
                          type="password"
                          minLength={6}
                          required
                          placeholder="New password (อย่างน้อย 6 ตัว)"
                          className="input-base flex-1 text-sm"
                        />
                        <button
                          type="submit"
                          disabled={pending}
                          className="btn-primary text-xs px-3 disabled:opacity-50"
                        >
                          {pending ? "..." : "บันทึก"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowResetPw(false)}
                          className="btn-secondary text-xs px-3"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setShowResetPw(true); setResetMsg(null); }}
                      className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Reset Password
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700/60 flex-shrink-0">
              {!isSelf && (
                <>
                  {confirmDelete ? (
                    <div className="flex items-center gap-3 mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <span className="text-sm text-red-700 dark:text-red-400 flex-1">ยืนยันลบ user นี้?</span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={pending}
                        className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        ลบ
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 mb-3"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> ลบ user นี้
                    </button>
                  )}
                </>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 btn-secondary">
                  ยกเลิก
                </button>
                <button
                  form="edit-user-form"
                  type="submit"
                  disabled={pending || isSelf}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {pending ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>
          </div>
      </ModalOverlay>
    </>
  );
}
