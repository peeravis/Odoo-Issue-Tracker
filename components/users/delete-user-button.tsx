"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteUserButton({
  userId,
  userName,
  deleteAction,
}: {
  userId: string;
  userName: string;
  deleteAction: (id: string) => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteAction(userId);
      router.push("/users");
    });
  };

  if (confirm) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
        <span className="text-sm text-red-700 dark:text-red-400">ลบ <strong>{userName}</strong>?</span>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "กำลังลบ..." : "ยืนยัน"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="px-3 py-1 text-xs font-medium bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
        >
          ยกเลิก
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
    >
      <Trash2 className="h-4 w-4" />
      ลบ User
    </button>
  );
}
