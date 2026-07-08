"use client";

import { useState } from "react";
import { createProject } from "@/app/actions/projects";
import { Plus, X, FolderPlus } from "lucide-react";
import { ModalOverlay } from "@/components/ui/motion";

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <FolderPlus className="h-4 w-4" />
        New Project
      </button>

      <ModalOverlay open={open} onClose={() => setOpen(false)}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-auto shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="font-semibold text-gray-900 dark:text-white">สร้าง Project ใหม่</h2>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
          <form action={async (fd) => { await createProject(fd); setOpen(false); }} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                ชื่อ Project <span className="text-red-500">*</span>
              </label>
              <input name="name" required className="input-base w-full" placeholder="เช่น Upgrade Odoo Phase 1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Project Code <span className="text-red-500">*</span>
              </label>
              <input name="code" required placeholder="เช่น ODOO, ERP01" className="input-base w-full" />
              <p className="text-xs text-gray-400 mt-1">ใช้เป็น prefix ของ issue ID (ตัวพิมพ์ใหญ่)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">คำอธิบาย</label>
              <textarea name="description" rows={2} className="input-base w-full resize-none" placeholder="รายละเอียด project (ไม่บังคับ)" />
            </div>
            <div className="flex gap-3 pt-1">
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
