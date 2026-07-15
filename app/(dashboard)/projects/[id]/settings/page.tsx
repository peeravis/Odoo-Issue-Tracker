import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getPermissions } from "@/lib/permissions";
import {
  upsertFieldDefinition,
  deleteFieldDefinition,
  addProjectMember,
  removeProjectMember,
  updateProject,
  addProjectDropdown,
  deleteProjectDropdown,
  upsertStatusConfig,
  updateProjectMemberRole,
  updateProjectGroup,
} from "@/app/actions/projects";
import { ArrowLeft, Plus } from "lucide-react";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";

const DROPDOWN_TYPES = [
  { key: "issueType", label: "Issue Type" },
  { key: "module", label: "Module" },
  { key: "department", label: "Department" },
] as const;

const ALL_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
  "reopened",
  "wait_for_user_check",
] as const;

const PROJECT_ROLES = [
  { value: "pm", label: "PM" },
  { value: "developer", label: "Developer" },
  { value: "viewer", label: "Viewer" },
] as const;

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  const perms = await getPermissions(session.role);
  if (!perms.canManageProjects) redirect("/projects");

  const [project, allGroups] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        fieldDefs: { orderBy: { sortOrder: "asc" } },
        members: { include: { user: true }, orderBy: { createdAt: "asc" } },
        dropdownItems: { orderBy: { sortOrder: "asc" } },
        statusConfigs: { orderBy: { sortOrder: "asc" } },
        group: true,
      },
    }),
    prisma.projectGroup.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  if (!project) notFound();

  const allUsers = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  // Global (projectId=null) dropdown items for hint display
  const globalDropdowns = await prisma.dropdownMaster.findMany({
    where: { projectId: null },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  });

  const memberIds = new Set(project.members.map((m) => m.userId));

  const updateProjectAction = updateProject.bind(null, id);
  const addMemberAction = addProjectMember.bind(null, id);
  const removeMemberAction = removeProjectMember.bind(null, id);
  const upsertFieldAction = upsertFieldDefinition.bind(null, id);
  const deleteFieldAction = deleteFieldDefinition.bind(null, id);
  const addDropdownAction = addProjectDropdown.bind(null, id);
  const upsertStatusAction = upsertStatusConfig.bind(null, id);
  const updateGroupAction = updateProjectGroup.bind(null, id);

  const projectDropdownsByType = (type: string) =>
    project.dropdownItems.filter((i) => i.type === type);
  const globalDropdownsByType = (type: string) =>
    globalDropdowns.filter((i) => i.type === type);

  // Build status config map: statusKey -> config row (or undefined)
  const statusConfigMap = new Map(project.statusConfigs.map((c) => [c.statusKey, c]));

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
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Group</label>
          <form action={updateGroupAction} className="flex gap-2">
            <select name="groupId" defaultValue={project.groupId ?? ""} className="input-base flex-1">
              <option value="">— ไม่ระบุกลุ่ม —</option>
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <button type="submit" className="btn-secondary !px-3 text-sm">Save</button>
          </form>
        </div>
      </Section>

      {/* Members */}
      <Section title="Members">
        <div className="space-y-2 mb-4">
          {project.members.map((m) => {
            const updateRoleAction = updateProjectMemberRole.bind(null, id, m.userId);
            return (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{m.user.name}</p>
                  <p className="text-xs text-gray-400">{m.user.email} · {m.user.role}</p>
                </div>
                {/* Project role select */}
                <form action={async (fd: FormData) => {
                  "use server";
                  const role = fd.get("projectRole") as string;
                  await updateRoleAction(role);
                }} className="flex items-center gap-2">
                  <select
                    name="projectRole"
                    defaultValue={m.projectRole}
                    onChange={undefined}
                    className="input-base text-xs py-1"
                  >
                    {PROJECT_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">Save</button>
                </form>
                <DeleteConfirmButton action={removeMemberAction.bind(null, m.userId)} className="text-red-500 hover:text-red-700 p-1" />
              </div>
            );
          })}
        </div>
        <form action={addMemberAction} className="flex gap-2">
          <select name="userId" className="input-base flex-1">
            <option value="">-- เพิ่ม member --</option>
            {allUsers.filter((u) => !memberIds.has(u.id)).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
          <select name="projectRole" className="input-base" defaultValue="developer">
            {PROJECT_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </Section>

      {/* Clients */}
      <Section title="Clients">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Client จัดการรวมอยู่ใน Master Data
        </p>
        <Link href="/master-data" className="btn-secondary inline-flex items-center gap-2">
          จัดการ Master Data →
        </Link>
      </Section>

      {/* Per-Project Dropdowns */}
      <Section title="Per-Project Dropdowns">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          เพิ่ม dropdown options เฉพาะ project นี้ ถ้าไม่มีจะใช้ Global options แทน
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {DROPDOWN_TYPES.map(({ key, label }) => {
            const projectItems = projectDropdownsByType(key);
            const globalItems = globalDropdownsByType(key);
            return (
              <div key={key} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600/50 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">{label}</h3>

                {/* Global hints */}
                {globalItems.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-1">Global (fallback):</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      {globalItems.map((i) => i.label).join(", ")}
                    </p>
                  </div>
                )}

                {/* Project-specific items */}
                <div className="space-y-1 mb-3 min-h-[32px]">
                  {projectItems.length === 0 && (
                    <p className="text-xs text-gray-400 italic">ยังไม่มี project-specific options</p>
                  )}
                  {projectItems.map((item) => {
                    const deleteAction = deleteProjectDropdown.bind(null, item.id, id);
                    return (
                      <div key={item.id} className="flex items-center justify-between group py-0.5 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/40">
                        <span className="text-sm text-gray-800 dark:text-gray-200">{item.label}</span>
                        <DeleteConfirmButton action={deleteAction} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-0.5 transition-opacity" iconClassName="h-3.5 w-3.5" />
                      </div>
                    );
                  })}
                </div>

                {/* Add form */}
                <form action={async (fd: FormData) => {
                  "use server";
                  await addDropdownAction(fd);
                }} className="flex gap-1.5">
                  <input type="hidden" name="type" value={key} />
                  <input
                    name="label"
                    placeholder={`Add ${label}...`}
                    required
                    className="input-base flex-1 text-sm !py-1"
                  />
                  <button type="submit" className="btn-primary !px-2 !py-1">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Status Configuration */}
      <Section title="Status Configuration">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          เลือก status ที่ active และกำหนด label สำหรับ project นี้ ถ้าไม่กำหนดจะใช้ค่า default
        </p>
        <form action={async (fd: FormData) => {
          "use server";
          await upsertStatusAction(fd);
        }} className="space-y-3">
          {ALL_STATUSES.map((statusKey, idx) => {
            const cfg = statusConfigMap.get(statusKey);
            const defaultLabel = STATUS_LABELS[statusKey];
            const defaultColor = STATUS_COLORS[statusKey];
            const isActive = cfg ? cfg.isActive : true;
            return (
              <div key={statusKey} className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <input type="hidden" name={`configs[${idx}][statusKey]`} value={statusKey} />
                <input type="hidden" name={`configs[${idx}][sortOrder]`} value={idx} />
                <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    name={`configs[${idx}][isActive]`}
                    defaultChecked={isActive}
                    value="true"
                    className="rounded"
                  />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${defaultColor}`}>
                    {statusKey}
                  </span>
                </label>
                <input
                  name={`configs[${idx}][label]`}
                  defaultValue={cfg?.label ?? defaultLabel}
                  placeholder={defaultLabel}
                  className="input-base flex-1 text-sm !py-1"
                />
              </div>
            );
          })}
          {/* Submit serializes as JSON via hidden input handled server-side */}
          <StatusConfigSubmitButton />
        </form>
      </Section>

      {/* Global Dropdown Options (link) */}
      <Section title="Global Dropdown Options">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Issue Type, Module และ Department แบบ Global — ใช้เมื่อ project ไม่มี options เฉพาะ
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

// Status config uses a client component to serialize the form as JSON before submit
// But since we're in a server component tree, we handle it with named inputs
// The server action reads them individually via formData.getAll pattern
function StatusConfigSubmitButton() {
  return (
    <div className="pt-2">
      <button type="submit" className="btn-primary">Save Status Config</button>
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
