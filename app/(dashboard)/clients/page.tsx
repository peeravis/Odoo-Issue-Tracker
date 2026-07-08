import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { upsertClient, deleteClient } from "@/app/actions/clients";
import { FadeUp } from "@/components/ui/motion";
import { Trash2, Plus, Download } from "lucide-react";
import { ImportClientsButton } from "@/components/clients/import-clients-button";

export default async function ClientsPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { issues: true } } },
  });

  return (
    <div className="space-y-6">
      <FadeUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Clients</h1>
            <p className="text-sm text-gray-400 mt-0.5">Master data — {clients.length} clients</p>
          </div>
          <div className="flex gap-2">
            <a href="/api/clients/export" className="btn-secondary inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </a>
            <ImportClientsButton />
          </div>
        </div>
      </FadeUp>

      {/* Add new client form */}
      <FadeUp delay={0.05}>
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">เพิ่ม Client ใหม่</h2>
          <form action={upsertClient} className="flex gap-3 items-end">
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
        </div>
      </FadeUp>

      {/* Import hint */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/60 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
        <p className="font-medium mb-1">Import จาก Excel</p>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          รูปแบบ Excel: คอลัมน์ A = <strong>Name</strong>, B = <strong>Code</strong>, C = <strong>Contact</strong> (แถวแรกเป็น header)
        </p>
      </div>

      {/* Client list */}
      <FadeUp delay={0.1}>
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700/60">
                <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Code</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Contact</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Issues</th>
                <th className="w-16 px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                    ยังไม่มี client — เพิ่มข้างบนหรือ import จาก Excel
                  </td>
                </tr>
              )}
              {clients.map((c) => (
                <ClientRow key={c.id} client={c} />
              ))}
            </tbody>
          </table>
        </div>
      </FadeUp>
    </div>
  );
}

function ClientRow({ client }: { client: { id: string; name: string; code: string | null; contactInfo: string | null; _count: { issues: number } } }) {
  const deleteAction = deleteClient.bind(null, client.id);
  return (
    <tr className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors duration-150">
      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{client.name}</td>
      <td className="px-5 py-3 text-gray-400 font-mono text-xs">{client.code ?? "-"}</td>
      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">{client.contactInfo ?? "-"}</td>
      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">{client._count.issues} issues</td>
      <td className="px-5 py-3">
        <form action={deleteAction}>
          <button type="submit" className="text-red-400 hover:text-red-600 p-1">
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </td>
    </tr>
  );
}
