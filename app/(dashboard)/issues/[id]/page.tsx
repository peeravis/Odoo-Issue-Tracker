import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PriorityBadge } from "@/components/issues/priority-badge";
import { StatusBadge } from "@/components/issues/status-badge";
import { StatusDropdown } from "@/components/issues/status-dropdown";
import { formatDate, formatDateTime, generateIssueCode } from "@/lib/utils";
import { updateIssue, addComment, uploadAttachment, deleteAttachment, deleteComment } from "@/app/actions/issues";
import { getPermissions } from "@/lib/permissions";
import { ArrowLeft, MessageSquare, Clock, Edit2, Check, Paperclip } from "lucide-react";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";
import { StatusSolutionFields } from "@/components/issues/status-solution-fields";
import { ToastHandler } from "@/components/ui/toast-handler";
import { AttachmentList } from "@/components/issues/attachment-list";
import { Markdown } from "@/components/ui/markdown";
import { DescriptionWithAttachments } from "@/components/issues/description-with-attachments";
import { getDropdowns, getAssigneeUsers } from "@/lib/db/dropdowns";
import { SearchableSelect } from "@/components/ui/searchable-select";

export default async function IssueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; toast?: string }>;
}) {
  const { id } = await params;
  const { edit, toast } = await searchParams;

  const session = await getSession();
  if (!session) return null;

  const issuePerms = await getPermissions(session.role);

  const issue = await prisma.issue.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          fieldDefs: { orderBy: { sortOrder: "asc" } },
        },
      },
      client: true,
      createdBy: true,
      loggedBy: true,
      assignee: true,
      modifiedBy: true,
      comments: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
      attachments: { include: { uploadedBy: true }, orderBy: { createdAt: "desc" } },
      activityLogs: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!issue) notFound();

  // Roles without canViewAllProjects can only view issues from their assigned projects
  if (!issuePerms.canViewAllProjects) {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: issue.projectId, userId: session.userId } },
    });
    if (!membership) notFound();
  }

  const [allUsers, allClients, masterIssueTypes, masterModules, masterDepartments] = await Promise.all([
    getAssigneeUsers(),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getDropdowns("issueType", issue.projectId),
    getDropdowns("module", issue.projectId),
    getDropdowns("department", issue.projectId),
  ]);

  const isEditing = edit === "1";
  const issueCode = generateIssueCode(issue.project.code, issue.issueNumber);
  const customFields = (issue.customFields as Record<string, unknown>) ?? {};

  const updateAction = updateIssue.bind(null, id);
  const commentAction = addComment.bind(null, id);
  const uploadAction = uploadAttachment.bind(null, id);
  const deleteAttachmentAction = deleteAttachment.bind(null, id);
  const canManage = issuePerms.canViewAllProjects;
  const isAdmin = session.role === "admin";

  return (
    <div className="max-w-5xl space-y-6">
      <ToastHandler toast={toast} />
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href={`/issues?projectId=${issue.projectId}`} className="mt-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-400">{issueCode}</span>
              <PriorityBadge priority={issue.priority} />
              <StatusDropdown issueId={id} status={issue.status} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{issue.title}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {issue.project.name} · Created by {issue.createdBy.name} on {formatDate(issue.createdAt)}
            </p>
          </div>
        </div>
        {!isEditing && (
          <Link
            href={`/issues/${id}?edit=1`}
            className="inline-flex items-center gap-2 btn-secondary flex-shrink-0"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {isEditing ? (
            /* Edit Form */
            <form action={updateAction} className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-6 shadow-sm space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Edit Issue</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title <span className="text-red-500">*</span></label>
                <input name="title" defaultValue={issue.title} required className="input-base w-full" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
                  <SearchableSelect
                    name="clientId"
                    options={allClients.map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="-- None --"
                    defaultValue={issue.clientId ?? ""}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หน่วยงาน</label>
                  {masterDepartments.length > 0 ? (
                    <select name="department" defaultValue={issue.department ?? ""} className="input-base w-full">
                      <option value="">-- None --</option>
                      {masterDepartments.map((o) => (
                        <option key={o.id} value={o.label}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input name="department" defaultValue={issue.department ?? ""} placeholder="ระบุหน่วยงาน" className="input-base w-full" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Type</label>
                  {masterIssueTypes.length > 0 ? (
                    <SearchableSelect
                      name="issueType"
                      options={masterIssueTypes.map((o) => ({ value: o.label, label: o.label }))}
                      placeholder="-- None --"
                      defaultValue={issue.issueType ?? ""}
                    />
                  ) : (
                    <input name="issueType" defaultValue={issue.issueType ?? ""} placeholder="ระบุประเภท issue" className="input-base w-full" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Module</label>
                  {masterModules.length > 0 ? (
                    <select name="module" defaultValue={issue.module ?? ""} className="input-base w-full">
                      <option value="">-- None --</option>
                      {masterModules.map((o) => (
                        <option key={o.id} value={o.label}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input name="module" defaultValue={issue.module ?? ""} placeholder="ระบุ module" className="input-base w-full" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select name="priority" defaultValue={issue.priority} className="input-base w-full">
                    {["high", "medium", "low"].map((p) => (
                      <option key={p} value={p} className="capitalize">{p}</option>
                    ))}
                  </select>
                </div>

                <StatusSolutionFields defaultStatus={issue.status} defaultSolution={issue.solution ?? ""} />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To</label>
                  <SearchableSelect
                    name="assigneeId"
                    options={allUsers.map((u) => {
                      const role = u.extraRoles.includes("aspd") ? "ASPD" : "Vendor";
                      return { value: u.id, label: `${u.name} (${role})` };
                    })}
                    placeholder="-- Unassigned --"
                    defaultValue={issue.assigneeId ?? ""}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Logged By</label>
                  <input type="hidden" name="loggedById" value={issue.loggedById ?? ""} />
                  <input type="text" value={issue.loggedBy?.email ?? issue.loggedBy?.name ?? "-"} readOnly className="input-base w-full bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Reported</label>
                  <input
                    type="date"
                    name="dateReported"
                    defaultValue={issue.dateReported?.toISOString().split("T")[0]}
                    className="input-base w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    defaultValue={issue.dueDate?.toISOString().split("T")[0]}
                    className="input-base w-full"
                  />
                </div>
              </div>


              <DescriptionWithAttachments defaultDescription={issue.description ?? ""} />

              {/* Custom fields */}
              {issue.project.fieldDefs.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {field.label}
                    {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.fieldType === "textarea" ? (
                    <textarea
                      name={`custom_${field.fieldKey}`}
                      defaultValue={String(customFields[field.fieldKey] ?? "")}
                      required={field.isRequired}
                      rows={3}
                      className="input-base w-full"
                    />
                  ) : field.fieldType === "boolean" ? (
                    <SearchableSelect
                      name={`custom_${field.fieldKey}`}
                      options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]}
                      placeholder="--"
                      defaultValue={String(customFields[field.fieldKey] ?? "")}
                    />
                  ) : field.fieldType === "select" ? (
                    <SearchableSelect
                      name={`custom_${field.fieldKey}`}
                      options={((field.options as string[]) ?? []).map((o) => ({ value: o, label: o }))}
                      placeholder="--"
                      defaultValue={String(customFields[field.fieldKey] ?? "")}
                      required={field.isRequired}
                    />
                  ) : field.fieldType === "multiselect" ? (
                    <select
                      name={`custom_${field.fieldKey}`}
                      defaultValue={String(customFields[field.fieldKey] ?? "")}
                      multiple
                      className="input-base w-full"
                    >
                      <option value="">--</option>
                      {((field.options as string[]) ?? []).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : field.fieldType === "url" ? "url" : "text"}
                      name={`custom_${field.fieldKey}`}
                      defaultValue={String(customFields[field.fieldKey] ?? "")}
                      required={field.isRequired}
                      className="input-base w-full"
                    />
                  )}
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <Link href={`/issues/${id}`} className="btn-secondary flex-1 text-center py-2">Cancel</Link>
                <button type="submit" className="btn-primary flex-1">
                  <Check className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            /* View Mode */
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-6 shadow-sm space-y-4">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h2>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {issue.description
                    ? <Markdown content={issue.description} />
                    : <span className="text-gray-400 italic">No description provided</span>}
                </div>
              </div>

              <hr className="border-gray-100 dark:border-gray-700" />

              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Solution</h2>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {issue.solution
                    ? <Markdown content={issue.solution} />
                    : <span className="text-gray-400 italic">No solution provided</span>}
                </div>
              </div>

              {/* Custom fields view */}
              {issue.project.fieldDefs.length > 0 && (
                <>
                  <hr className="border-gray-100 dark:border-gray-700" />
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">Custom Fields</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {issue.project.fieldDefs.map((f) => (
                      <div key={f.id}>
                        <p className="text-xs text-gray-400">{f.label}</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          {String(customFields[f.fieldKey] ?? "-")}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Comments
              </h2>
              {issue.comments.length > 0 && (
                <span className="ml-auto text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded-full">
                  {issue.comments.length}
                </span>
              )}
            </div>
            <div className="px-6 py-4 space-y-4">
              {issue.comments.length === 0 && (
                <p className="text-sm text-center text-gray-400 py-4 italic">ยังไม่มี comment</p>
              )}
              {issue.comments.map((c) => {
                const isOwn = c.userId === session.userId;
                return (
                  <div key={c.id} className={`group flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm">
                      {c.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`flex-1 max-w-[85%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div className={`flex items-center gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{c.user.name}</span>
                        <span className="text-xs text-gray-400">{formatDateTime(c.createdAt)}</span>
                        {(isOwn || isAdmin) && (
                          <DeleteConfirmButton action={deleteComment.bind(null, c.id, id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-0.5 rounded transition-opacity" iconClassName="h-3 w-3" />
                        )}
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                        isOwn
                          ? "bg-indigo-600 text-white rounded-tr-sm"
                          : "bg-gray-100 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 rounded-tl-sm"
                      }`}>
                        <Markdown content={c.content} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 pb-4 border-t border-gray-100 dark:border-gray-700 pt-4">
              <form action={commentAction} className="flex gap-3 items-end">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm">
                  {session.name?.charAt(0).toUpperCase() ?? "U"}
                </div>
                <textarea
                  name="content"
                  placeholder="เพิ่ม comment..."
                  rows={2}
                  className="input-base flex-1 resize-none"
                />
                <button type="submit" className="btn-primary self-end flex-shrink-0">Send</button>
              </form>
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Attachments ({issue.attachments.length})
              </h2>
            </div>
            <AttachmentList
              attachments={issue.attachments}
              sessionUserId={session.userId}
              canManage={canManage}
              deleteAction={deleteAttachmentAction}
            />
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <form action={uploadAction} className="flex items-center gap-3">
                <input
                  type="file"
                  name="file"
                  required
                  className="flex-1 text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-900/30 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
                />
                <button type="submit" className="btn-primary flex-shrink-0">Upload</button>
              </form>
              <p className="text-xs text-gray-400 mt-1">สูงสุด 5 MB ต่อไฟล์</p>
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Details</h3>

            <DetailRow label="Project" value={issue.project.name} href={`/issues?projectId=${issue.projectId}`} />
            <DetailRow label="Client" value={issue.client?.name} href={issue.clientId ? `/issues?clientId=${issue.clientId}` : undefined} />
            <DetailRow label="หน่วยงาน" value={issue.department} href={issue.department ? `/issues?department=${encodeURIComponent(issue.department)}` : undefined} />
            <DetailRow label="Issue Type" value={issue.issueType} href={issue.issueType ? `/issues?issueType=${encodeURIComponent(issue.issueType)}` : undefined} />
            <DetailRow label="Module" value={issue.module} href={issue.module ? `/issues?module=${encodeURIComponent(issue.module)}` : undefined} />
            <AssigneeRow name={issue.assignee?.name} extraRoles={issue.assignee?.extraRoles} href={issue.assigneeId ? `/issues?assigneeId=${issue.assigneeId}` : undefined} />
            <DetailRow label="Logged By" value={issue.loggedBy?.email} />
            <DetailRow label="Created By" value={issue.createdBy.email} />
            <DetailRow label="Modified By" value={issue.modifiedBy?.name} />
            <DetailRow label="Date Reported" value={formatDate(issue.dateReported)} />
            <DetailRow
              label="Due Date"
              value={formatDate(issue.dueDate)}
              overdue={
                !!issue.dueDate &&
                new Date(issue.dueDate) < new Date() &&
                issue.status !== "resolved" &&
                issue.status !== "closed"
              }
            />
            <DetailRow label="Created" value={formatDateTime(issue.createdAt)} />
            <DetailRow label="Last Modified" value={formatDateTime(issue.lastModifiedAt)} />
            {issue.resolvedAt && <DetailRow label="Resolved At" value={formatDateTime(issue.resolvedAt)} />}
          </div>

          {/* Activity Log */}
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Activity</h3>
            </div>
            <div className="relative">
              {issue.activityLogs.length > 0 && (
                <div className="absolute left-2.5 top-2 bottom-2 w-px bg-gray-100 dark:bg-gray-700/60" />
              )}
              <div className="space-y-3">
                {issue.activityLogs.map((log) => {
                  const dotColor =
                    log.action === "created" ? "bg-green-500" :
                    log.action === "status_changed" ? "bg-amber-500" :
                    log.action === "commented" ? "bg-indigo-500" :
                    log.action === "priority_changed" ? "bg-orange-500" :
                    log.action === "assignee_changed" ? "bg-purple-500" :
                    log.action === "duedate_changed" ? "bg-blue-500" :
                    log.action === "description_updated" || log.action === "solution_updated" ? "bg-teal-500" :
                    "bg-gray-400";
                  const ringColor = dotColor.replace("bg-", "bg-").replace("500", "100").replace("dark", "dark");

                  const renderAction = () => {
                    switch (log.action) {
                      case "created": return <span className="text-gray-500">created this issue</span>;
                      case "commented": return <span className="text-gray-500">added a comment</span>;
                      case "description_updated": return <span className="text-gray-500">updated the description</span>;
                      case "solution_updated": return <span className="text-gray-500">updated the solution</span>;
                      case "status_changed": return <><span className="text-gray-500">changed status</span>{" "}
                        <span className="line-through text-gray-400 text-xs">{log.oldValue}</span>{" → "}
                        <span className="font-medium text-amber-600 dark:text-amber-400">{log.newValue}</span></>;
                      case "priority_changed": return <><span className="text-gray-500">changed priority</span>{" "}
                        <span className="line-through text-gray-400 text-xs">{log.oldValue}</span>{" → "}
                        <span className="font-medium text-orange-600 dark:text-orange-400">{log.newValue}</span></>;
                      case "assignee_changed": return <><span className="text-gray-500">reassigned to</span>{" "}
                        <span className="font-medium text-purple-600 dark:text-purple-400">{log.newValue ?? "Unassigned"}</span></>;
                      case "duedate_changed": return <><span className="text-gray-500">changed due date</span>{" "}
                        {log.oldValue && <><span className="line-through text-gray-400 text-xs">{log.oldValue}</span>{" → "}</>}
                        <span className="font-medium text-blue-600 dark:text-blue-400">{log.newValue ?? "removed"}</span></>;
                      case "title_changed": return <><span className="text-gray-500">changed title to</span>{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-200">&ldquo;{log.newValue}&rdquo;</span></>;
                      default: return <span className="text-gray-400 text-xs">{log.action.replace(/_/g, " ")}</span>;
                    }
                  };

                  return (
                    <div key={log.id} className="flex gap-3 items-start relative">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 z-10 mt-0.5 bg-gray-100 dark:bg-gray-700/50`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{log.user.name}</span>{" "}
                          {renderAction()}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(log.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
                {issue.activityLogs.length === 0 && (
                  <p className="text-xs text-gray-400 pl-8">No activity yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssigneeRow({ name, extraRoles, href }: { name?: string | null; extraRoles?: string[]; href?: string }) {
  const role = extraRoles?.includes("aspd") ? "ASPD" : extraRoles?.includes("vendor") ? "Vendor" : null;
  const inner = name ? (
    <div className="flex items-center gap-2">
      <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline">{name}</span>
        {role && <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{role}</span>}
      </div>
    </div>
  ) : (
    <span className="text-xs text-gray-300 dark:text-gray-600">-</span>
  );

  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-xs text-gray-400 flex-shrink-0">Assignee</span>
      {name && href ? (
        <Link href={href} className="group">{inner}</Link>
      ) : inner}
    </div>
  );
}

function DetailRow({ label, value, overdue, href }: { label: string; value?: string | null; overdue?: boolean; href?: string }) {
  const textClass = `text-xs text-right flex items-center gap-1.5 ${overdue ? "text-red-500 font-medium" : "text-gray-800 dark:text-gray-200"}`;
  const content = (
    <>
      {value ?? "-"}
      {overdue && (
        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-semibold">
          Overdue
        </span>
      )}
    </>
  );
  return (
    <div className="flex justify-between gap-2">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      {value && href ? (
        <Link href={href} className={`${textClass} hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline`}>{content}</Link>
      ) : (
        <span className={textClass}>{content}</span>
      )}
    </div>
  );
}
