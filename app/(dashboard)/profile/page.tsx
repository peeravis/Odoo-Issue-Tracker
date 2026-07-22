"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/auth";
import { KeyRound, CheckCircle, AlertCircle } from "lucide-react";

export default function ProfilePage() {
  const [state, action, pending] = useActionState(changePassword, undefined);

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">เปลี่ยนรหัสผ่าน</h1>
        <p className="text-sm text-gray-400 mt-0.5">อัปเดตรหัสผ่านสำหรับบัญชีของคุณ</p>
      </div>

      <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-6 shadow-sm">
        {state?.success && (
          <div className="flex items-center gap-2 mb-5 p-3.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            เปลี่ยนรหัสผ่านสำเร็จ
          </div>
        )}

        {state?.error && (
          <div className="flex items-center gap-2 mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
            className="w-full btn-primary"
          >
            {pending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                กำลังบันทึก...
              </span>
            ) : (
              "เปลี่ยนรหัสผ่าน"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
