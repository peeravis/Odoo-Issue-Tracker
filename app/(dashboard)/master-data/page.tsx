import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Plus, Download } from "lucide-react";
import { FadeUp } from "@/components/ui/motion";
import { addDropdownMaster, deleteDropdownMaster } from "@/app/actions/master";
import { upsertClient, deleteClient } from "@/app/actions/clients";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";
import { ImportClientsButton } from "@/components/clients/import-clients-button";

const TYPES = [
  { key: "issueType", label: "Issue Type" },
  { key: "module",    label: "Module" },
  { key: "department", label: "Department" },
];

export default async function MasterDataPage() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "pm")) redirect("/projects");

  const [items, clients] = await Promise.all([
    prisma.dropdownMaster.findMany({ where: { projectId: null }, orderBy: [{ type: "asc" }, { sortOrder: "asc" }] }),
    prisma.client.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { issues: true } } } }),
  ]);

  const byType = (type: string) => items.filter((i) => i.type === type);

  return (
    <div className="space-y-8 max-w-5xl">
      <FadeUp>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Master Data</h1>
          <p className="text-sm text-gray-400 mt-0.5">ข้อมูลกลางที่ใช้ร่วมกันทุก Project</p>
        </div>
      </FadeUp>

      {/* Dropdown Options */}
      <FadeUp delay={0.05}>
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Global Dropdown Options</h2>
          <p className="text-xs text-gray-400 mb-5">ใช้เป็น fallback เมื่อ Project ไม่มี options เฉพาะ</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TYPES.map(({ key, label }) => {
              const addAction = addDropdownMaster.bind(null, key);
              return (
                <div key={key} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600/50 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">{label}</h3>

                  <div className="space-y-1 mb-4 min-h-[40px]">
                    {byType(key).length === 0 && (
                      <p className="text-xs text-gray-400 italic">ยังไม่มีข้อมูล</p>
                    )}
                    {byType(key).map((item) => {
                      const deleteAction = deleteDropdownMaster.bind(null, item.id);
                      return (
                        <div key={item.id} className="flex items-center justify-between group py-1 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/40">
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
                    <input name="label" placeholder={`Add ${label}...`} required className="input-base flex-1 text-sm" />
                    <button type="submit" className="btn-primary !px-2.5 !py-1.5">
                      <Plus className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      </FadeUp>

      {/* Clients */}
      <FadeUp delay={0.1}>
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Clients</h2>
              <p className="text-xs text-gray-400">{clients.length} clients</p>
            </div>
            <div className="flex gap-2">
              <a href="/api/clients/export" className="btn-secondary inline-flex items-center gap-2 text-sm">
                <Download className="h-4 w-4" />
                Export
              </a>
              <ImportClientsButton />
            </div>
          </div>

          {/* Add form */}
          <form action={upsertClient} className="flex gap-3 items-end mb-5">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">ชื่อ Client *</label>
              <input name="name" placeholder="ชื่อลูกค้า / บริษัท" required className="input-base w-full" />
            </div>
            <div className="w-32">
              <label className="block text-xs text-gray-500 mb-1">Code</label>
              <input name="code" placeholder="รหัส" className="input-base w-full" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Contact</label>
              <input name="contactInfo" placeholder="ติดต่อ / email / เบอร์" className="input-base w-full" />
            </div>
            <button type="submit" className="btn-primary flex items-center gap-2 flex-shrink-0">
              <Plus className="h-4 w-4" /> Add
            </button>
          </form>

          {/* Import hint */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/60 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 mb-5">
            <span className="font-medium">Import จาก Excel:</span>{" "}
            คอลัมน์ A = <strong>Name</strong>, B = <strong>Code</strong>, C = <strong>Contact</strong> (แถวแรกเป็น header)
          </div>

          {/* Table */}
          <div className="rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700/60">
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Code</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Contact</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Issues</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                      ยังไม่มี client — เพิ่มข้างบนหรือ import จาก Excel
                    </td>
                  </tr>
                )}
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{c.name}</td>
                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{c.code ?? "-"}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{c.contactInfo ?? "-"}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{c._count.issues}</td>
                    <td className="px-4 py-2.5">
                      <DeleteConfirmButton action={deleteClient.bind(null, c.id)} className="text-red-400 hover:text-red-600 p-1" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </FadeUp>
    </div>
  );
}
