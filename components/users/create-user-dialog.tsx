"use client";

import { useState } from "react";
import { createUser } from "@/app/actions/users";
import { Plus, X, UserPlus } from "lucide-react";
import { ModalOverlay } from "@/components/ui/motion";

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <UserPlus className="h-4 w-4" />
        New User
      </button>

      <ModalOverlay open={open} onClose={() => setOpen(false)}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-auto shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="font-semibold text-gray-900 dark:text-white">สร้าง User ใหม่</h2>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
          <form
            action={async (fd) => { await createUser(fd); setOpen(false); }}
            className="p-6 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                ชื่อ <span className="text-red-500">*</span>
              </label>
              <input name="name" required className="input-base w-full" placeholder="ชื่อ-นามสกุล" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input name="email" type="email" required className="input-base w-full" placeholder="user@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <input name="password" type="password" required minLength={6} className="input-base w-full" placeholder="อย่างน้อย 6 ตัวอักษร" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
              <select name="role" defaultValue="member" className="input-base w-full">
                <option value="admin">Admin</option>
                <option value="pm">PM</option>
                <option value="member">Member</option>
                <option value="rnao">RNAO</option>
                <option value="co">CO</option>
                <option value="gl">GL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Assignable Roles</label>
              <div className="flex flex-wrap gap-4">
                {(["vendor", "aspd"] as const).map((r) => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="extraRoles" value={r} className="rounded border-gray-300 dark:border-gray-600 text-indigo-600" />
                    <span className="text-sm text-gray-800 dark:text-gray-200 uppercase tracking-wide">{r}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">ปรากฎใน Assignee dropdown ของ issue</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 btn-secondary">ยกเลิก</button>
              <button type="submit" className="flex-1 btn-primary">
                <Plus className="h-4 w-4" /> สร้าง
              </button>
            </div>
          </form>
        </div>
      </ModalOverlay>
    </>
  );
}
