import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createIssue } from "@/app/actions/issues";
import { ArrowLeft } from "lucide-react";
import { ProjectSelector } from "@/components/issues/project-selector";
import { getPermissions } from "@/lib/permissions";
import { StatusSolutionFields } from "@/components/issues/status-solution-fields";
import { DescriptionWithAttachments } from "@/components/issues/description-with-attachments";

export default async function NewIssuePage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const newIssuePerms = await getPermissions(session.role);
  const canViewAll = newIssuePerms.canViewAllProjects;

  const userProjects = canViewAll
    ? await prisma.project.findMany({
        where: { status: "active" },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      })
    : await prisma.projectMember
        .findMany({
          where: { userId: session.userId },
          include: {
            project: {
              select: { id: true, name: true, code: true, status: true },
            },
          },
        })
        .then((m) => m.filter((x) => x.project.status === "active").map((x) => x.project));

  const selectedProjectId = sp.projectId ?? userProjects[0]?.id ?? "";

  async function getDropdowns(type: string, projectId: string) {
    if (projectId) {
      const projectSpecific = await prisma.dropdownMaster.findMany({
        where: { type, projectId },
        orderBy: { sortOrder: "asc" },
      });
      if (projectSpecific.length > 0) return projectSpecific;
    }
    return prisma.dropdownMaster.findMany({
      where: { type, projectId: null },
      orderBy: { sortOrder: "asc" },
    });
  }

  const [projectData, assigneeUsers, allClients, masterIssueTypes, masterModules, masterDepartments] = await Promise.all([
    selectedProjectId
      ? prisma.project.findUnique({
          where: { id: selectedProjectId },
          include: { fieldDefs: { orderBy: { sortOrder: "asc" } } },
        })
      : Promise.resolve(null),
    prisma.user.findMany({
      where: { isActive: true, extraRoles: { hasSome: ["vendor", "aspd"] } },
      select: { id: true, name: true, extraRoles: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getDropdowns("issueType", selectedProjectId),
    getDropdowns("module", selectedProjectId),
    getDropdowns("department", selectedProjectId),
  ]);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/issues" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Issue</h1>
      </div>

      <form action={createIssue} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">

        {/* Project selector — changing it reloads the page to show project-specific options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Project <span className="text-red-500">*</span>
          </label>
          <ProjectSelector projects={userProjects} selectedProjectId={selectedProjectId} />
          <p className="text-xs text-gray-400 mt-1">
            เปลี่ยน Project เพื่อโหลด dropdown options ของ project นั้น
          </p>
        </div>

        {/* Standard fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Issue Title <span className="text-red-500">*</span>
          </label>
          <input name="title" required className="input-base w-full" placeholder="ระบุปัญหา/หัวข้อ" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client <span className="text-red-500">*</span></label>
            <select name="clientId" required className="input-base w-full">
              <option value="">-- Select Client --</option>
              {allClients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หน่วยงาน <span className="text-red-500">*</span></label>
            {masterDepartments.length ? (
              <select name="department" required className="input-base w-full">
                <option value="">-- Select --</option>
                {masterDepartments.map((o) => (
                  <option key={o.id} value={o.label}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input name="department" required placeholder="ระบุหน่วยงาน" className="input-base w-full" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Type</label>
            {masterIssueTypes.length ? (
              <select name="issueType" className="input-base w-full">
                <option value="">-- Select --</option>
                {masterIssueTypes.map((o) => (
                  <option key={o.id} value={o.label}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input name="issueType" placeholder="ระบุประเภท issue" className="input-base w-full" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Module <span className="text-red-500">*</span></label>
            {masterModules.length ? (
              <select name="module" required className="input-base w-full">
                <option value="">-- Select --</option>
                {masterModules.map((o) => (
                  <option key={o.id} value={o.label}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input name="module" required placeholder="ระบุ module" className="input-base w-full" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
            <select name="priority" defaultValue="medium" className="input-base w-full">
              {["high", "medium", "low"].map((p) => (
                <option key={p} value={p} className="capitalize">{p}</option>
              ))}
            </select>
          </div>

          <StatusSolutionFields />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Logged By</label>
            <input type="hidden" name="loggedById" value={session.userId} />
            <input type="text" value={session.email} readOnly className="input-base w-full bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To <span className="text-red-500">*</span></label>
            <select name="assigneeId" required className="input-base w-full">
              <option value="">-- Unassigned --</option>
              {assigneeUsers.map((u) => {
                const role = u.extraRoles.includes("aspd") ? "ASPD" : "Vendor";
                return <option key={u.id} value={u.id}>{u.name} ({role})</option>;
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Reported</label>
            <input type="date" name="dateReported" defaultValue={new Date().toISOString().split("T")[0]} className="input-base w-full" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date <span className="text-red-500">*</span></label>
            <input type="date" name="dueDate" required className="input-base w-full" />
          </div>
        </div>


        <DescriptionWithAttachments />

        {/* Custom fields */}
        {projectData?.fieldDefs?.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {field.label}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <CustomField field={field} />
          </div>
        ))}

        <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <Link href="/issues" className="btn-secondary flex-1 text-center py-2">Cancel</Link>
          <button type="submit" className="btn-primary flex-1">Create Issue</button>
        </div>
      </form>
    </div>
  );
}

function CustomField({
  field,
}: {
  field: {
    fieldKey: string;
    fieldType: string;
    options: unknown;
    isRequired: boolean;
  };
}) {
  const name = `custom_${field.fieldKey}`;
  const required = field.isRequired;

  if (field.fieldType === "textarea") {
    return <textarea name={name} required={required} rows={3} className="input-base w-full" />;
  }
  if (field.fieldType === "boolean") {
    return (
      <select name={name} required={required} className="input-base w-full">
        <option value="">-- Select --</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (field.fieldType === "select" || field.fieldType === "multiselect") {
    const opts = (field.options as string[]) ?? [];
    return (
      <select
        name={name}
        required={required}
        multiple={field.fieldType === "multiselect"}
        className="input-base w-full"
      >
        <option value="">-- Select --</option>
        {opts.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }

  const typeMap: Record<string, string> = {
    number: "number",
    date: "date",
    url: "url",
    text: "text",
  };

  return (
    <input
      type={typeMap[field.fieldType] ?? "text"}
      name={name}
      required={required}
      className="input-base w-full"
    />
  );
}
