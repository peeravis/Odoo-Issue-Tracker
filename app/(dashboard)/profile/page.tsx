"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/auth";
import { KeyRound, CheckCircle } from "lucide-react";

export default function ProfilePage() {
  const [state, action, pending] = useActionState(changePassword, undefined);

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">เปลี่ยนรหัสผ่าน</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-5 text-gray-600 dark:text-gray-400">
          <KeyRound className="h-4 w-4" />
          <span className="text-sm">กรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่</span>
        </div>

        {state?.success && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            เปลี่ยนรหัสผ่านสำเร็จ
          </div>
        )}

        {state?.error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {state.error}
          </div>
        )}

        <form action={action} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              รหัสผ่านปัจจุบัน
            </label>
            <input
              type="password"
              name="currentPassword"
              required
              className="input-base w-full"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              รหัสผ่านใหม่
            </label>
            <input
              type="password"
              name="newPassword"
              required
              minLength={6}
              className="input-base w-full"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-400 mt-1">อย่างน้อย 6 ตัวอักษร</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ยืนยันรหัสผ่านใหม่
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              className="input-base w-full"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full btn-primary py-2 disabled:opacity-50"
          >
            {pending ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
          </button>
        </form>
      </div>
    </div>
  );
}
