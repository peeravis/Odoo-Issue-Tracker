"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeleteConfirmButtonProps {
  action: () => Promise<void>;
  className?: string;
  iconClassName?: string;
  label?: string;
}

export function DeleteConfirmButton({ action, className, iconClassName = "h-4 w-4", label }: DeleteConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleConfirm = () => {
    startTransition(async () => {
      await action();
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Trash2 className={iconClassName} />
        {label && <span>{label}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">ยืนยันการลบ</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">คุณต้องการลบรายการนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setOpen(false)} disabled={pending} className="flex-1 btn-secondary py-2 text-sm">
                ยกเลิก
              </button>
              <button
                onClick={handleConfirm}
                disabled={pending}
                className="flex-1 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                {pending ? "กำลังลบ..." : "ลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
