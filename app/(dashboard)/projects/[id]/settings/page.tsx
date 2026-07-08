import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  upsertFieldDefinition,
  deleteFieldDefinition,
  addProjectMember,
  removeProjectMember,
  updateProject,
} from "@/app/actions/projects";
import { ArrowLeft } from "lucide-react";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "pm")) redirect("/projects");

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      fieldDefs: { orderBy: { sortOrder: "asc" } },
      members: { include: { user: true } },
    },
  });

  if (!project) notFound();

  const allUsers = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const memberIds = new Set(project.members.map((m) => m.userId));

  const updateProjectAction = updateProject.bind(null, id);
  const addMemberAction = addProjectMember.bind(null, id);
  const removeMemberAction = removeProjectMember.bind(null, id);
  const upsertFieldAction = upsertFieldDefinition.bind(null, id);
  const deleteFieldAction = deleteFieldDefinition.bind(null, id);

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/projects" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {project.name} — Settings
          </h1>
          <p className="text-sm text-gray-400 font-mono">{project.code}</p>
        </div>
      </div>

      {/* General Info */}
      <Section title="General">
        <form action={updateProjectAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input
                name="name"
                defaultValue={project.name}
                required
                className="input-base w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select name="status" defaultValue={project.status} className="input-base w-full">
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea name="description" defaultValue={project.description ?? ""} rows={2} className="input-base w-full" />
          </div>
          <button type="submit" className="btn-primary">Save Changes</button>
        </form>
      </Section>

      {/* Members */}
      <Section title="Members">
        <div className="space-y-2 mb-4">
          {project.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{m.user.name}</p>
                <p className="text-xs text-gray-400">{m.user.email} · {m.user.role}</p>
              </div>
              <DeleteConfirmButton action={removeMemberAction.bind(null, m.userId)} className="text-red-500 hover:text-red-700 p-1" />
            </div>
          ))}
        </div>
        <form action={async (fd: FormData) => { "use server"; await addMemberAction(fd.get("userId") as string); }} className="flex gap-2">
          <select name="userId" className="input-base flex-1">
            <option value="">-- เพิ่ม member --</option>
            {allUsers.filter((u) => !memberIds.has(u.id)).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </Section>

      {/* Clients */}
      <Section title="Clients">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Client เป็น Master Data แยกต่างหาก — จัดการได้ที่
        </p>
        <Link href="/clients" className="btn-secondary inline-flex items-center gap-2">
          จัดการ Client Master Data →
        </Link>
      </Section>

      {/* Dropdown Options */}
      <Section title="Dropdown Options">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Issue Type, Module และ Department เป็น Master Data กลางที่ใช้ร่วมกันทุก Project — จัดการได้ที่
        </p>
        <Link href="/master-data" className="btn-secondary inline-flex items-center gap-2">
          จัดการ Master Data →
        </Link>
      </Section>

      {/* Custom Fields */}
      <Section title="Custom Fields">
        <div className="space-y-2 mb-4">
          {project.fieldDefs.map((f) => (
            <div key={f.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">{f.label}</span>
              <span className="text-xs text-gray-400 font-mono">{f.fieldKey}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{f.fieldType}</span>
              {f.isRequired && <span className="text-xs text-red-500">required</span>}
              <DeleteConfirmButton action={deleteFieldAction.bind(null, f.id)} className="text-red-500 hover:text-red-700 p-1" />
            </div>
          ))}
        </div>

        <form action={upsertFieldAction} className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Field Key (slug)</label>
            <input name="fieldKey" placeholder="e.g. client_po_number" required className="input-base w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Label</label>
            <input name="label" placeholder="e.g. เลขที่ PO ลูกค้า" required className="input-base w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select name="fieldType" className="input-base w-full">
              {["text", "textarea", "number", "date", "boolean", "select", "multiselect", "url"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Options (JSON array, for select)</label>
            <input name="options" placeholder='["A","B","C"]' className="input-base w-full" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="isRequired" value="true" id="isRequired" className="rounded" />
            <label htmlFor="isRequired" className="text-sm text-gray-700 dark:text-gray-300">Required</label>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">Add Field</button>
          </div>
        </form>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}

