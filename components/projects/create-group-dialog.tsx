"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addProjectGroup } from "@/app/actions/projects";
import { Plus, X, Layers } from "lucide-react";
import { ModalOverlay } from "@/components/ui/motion";

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addProjectGroup(fd);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary inline-flex items-center gap-2">
        <Layers className="h-4 w-4" />
        New Group
      </button>

      <ModalOverlay open={open} onClose={() => setOpen(false)}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-auto shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="font-semibold text-gray-900 dark:text-white">สร้าง Group ใหม่</h2>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                ชื่อ Group <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                required
                autoFocus
                disabled={pending}
                className="input-base w-full"
                placeholder="เช่น Odoo, SAP, Internal"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setOpen(false)} disabled={pending} className="flex-1 btn-secondary">
                ยกเลิก
              </button>
              <button type="submit" disabled={pending} className="flex-1 btn-primary inline-flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                {pending ? "กำลังสร้าง..." : "สร้าง"}
              </button>
            </div>
          </form>
        </div>
      </ModalOverlay>
    </>
  );
}
