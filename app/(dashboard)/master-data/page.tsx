import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { FadeUp } from "@/components/ui/motion";
import { addDropdownMaster, deleteDropdownMaster } from "@/app/actions/master";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";

const TYPES = [
  { key: "issueType", label: "Issue Type" },
  { key: "module",    label: "Module" },
  { key: "department", label: "Department" },
];

export default async function MasterDataPage() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "pm")) redirect("/projects");

  const items = await prisma.dropdownMaster.findMany({ where: { projectId: null }, orderBy: [{ type: "asc" }, { sortOrder: "asc" }] });

  const byType = (type: string) => items.filter((i) => i.type === type);

  return (
    <div className="space-y-6 max-w-4xl">
      <FadeUp>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Master Data</h1>
          <p className="text-sm text-gray-400 mt-0.5">Dropdown options ที่ใช้ร่วมกันทุก Project</p>
        </div>
      </FadeUp>

      <FadeUp delay={0.05}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TYPES.map(({ key, label }) => {
            const addAction = addDropdownMaster.bind(null, key);
            return (
              <div key={key} className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-5 shadow-sm">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{label}</h2>

                <div className="space-y-1 mb-4 min-h-[40px]">
                  {byType(key).length === 0 && (
                    <p className="text-xs text-gray-400 italic">ยังไม่มีข้อมูล</p>
                  )}
                  {byType(key).map((item) => {
                    const deleteAction = deleteDropdownMaster.bind(null, item.id);
                    return (
                      <div key={item.id} className="flex items-center justify-between group py-1 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <span className="text-sm text-gray-800 dark:text-gray-200">{item.label}</span>
                        <DeleteConfirmButton action={deleteAction} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-0.5 transition-opacity" iconClassName="h-3.5 w-3.5" />
                      </div>
                    );
                  })}
                </div>

                <form action={async (fd: FormData) => {
                  "use server";
                  await addAction(fd.get("label") as string);
                }} className="flex gap-2">
                  <input
                    name="label"
                    placeholder={`Add ${label}...`}
                    required
                    className="input-base flex-1 text-sm"
                  />
                  <button type="submit" className="btn-primary !px-2.5 !py-1.5">
                    <Plus className="h-4 w-4" />
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </FadeUp>
    </div>
  );
}
