"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canViewAllProjects, generateIssueCode } from "@/lib/utils";
import { getPermissions } from "@/lib/permissions";
import { sendAssignmentEmail, sendWaitForCheckEmail, sendResolvedEmail, sendCommentEmail } from "@/lib/mailer";
import type { IssuePriority, IssueStatus } from "@/lib/types";
import { UPLOAD_DIR, MAX_FILE_SIZE, BASE_URL } from "@/lib/constants";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function createIssue(formData: FormData) {
  const session = await requireSession();

  const projectId = formData.get("projectId") as string;
  const title = formData.get("title") as string;
  const clientId = (formData.get("clientId") as string) || null;
  const department = (formData.get("department") as string) || null;
  const issueType = (formData.get("issueType") as string) || null;
  const module = (formData.get("module") as string) || null;
  const priority = (formData.get("priority") as IssuePriority) || "medium";
  const status = (formData.get("status") as IssueStatus) || "open";
  const description = (formData.get("description") as string) || null;
  const solution = (formData.get("solution") as string) || null;
  const loggedById = (formData.get("loggedById") as string) || null;
  const assigneeId = (formData.get("assigneeId") as string) || null;
  const dateReported = formData.get("dateReported") as string;
  const dueDate = formData.get("dueDate") as string;
  const attachmentFiles = formData.getAll("attachments") as File[];

  // Get next issue number
  const lastIssue = await prisma.issue.findFirst({
    where: { projectId },
    orderBy: { issueNumber: "desc" },
  });
  const issueNumber = (lastIssue?.issueNumber ?? 0) + 1;

  // Collect custom fields
  const customFields: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("custom_")) {
      customFields[key.replace("custom_", "")] = value;
    }
  }

  const issue = await prisma.issue.create({
    data: {
      projectId,
      issueNumber,
      title,
      clientId: clientId || undefined,
      department,
      issueType,
      module,
      priority,
      status,
      description,
      solution,
      createdById: session.userId,
      loggedById: loggedById || undefined,
      assigneeId: assigneeId || undefined,
      dateReported: dateReported ? new Date(dateReported) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      customFields: Object.keys(customFields).length ? customFields as never : undefined,
    },
  });

  await prisma.activityLog.create({
    data: {
      issueId: issue.id,
      userId: session.userId,
      action: "created",
      newValue: title,
    },
  });

  // Save attachments from description form
  const validFiles = attachmentFiles.filter((f) => f && f.size > 0 && f.size <= MAX_FILE_SIZE);
  if (validFiles.length > 0) {
    await mkdir(UPLOAD_DIR, { recursive: true });
    for (const file of validFiles) {
      const ext = path.extname(file.name);
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const filePath = path.join(UPLOAD_DIR, fileName);
      await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
      await prisma.attachment.create({
        data: { issueId: issue.id, fileName: file.name, fileUrl: `/api/uploads/${fileName}`, uploadedById: session.userId },
      });
    }
  }

  // Send assignment email if assignee set
  if (assigneeId) {
    const [assignee, project, client] = await Promise.all([
      prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true, email: true } }),
      prisma.project.findUnique({ where: { id: projectId }, select: { name: true, code: true } }),
      clientId ? prisma.client.findUnique({ where: { id: clientId }, select: { name: true } }) : null,
    ]);
    if (assignee?.email && project) {
      sendAssignmentEmail({
        to: assignee.email,
        assigneeName: assignee.name,
        issueTitle: title,
        issueCode: generateIssueCode(project.code, issueNumber),
        issueUrl: `${BASE_URL}/issues/${issue.id}`,
        projectName: project.name,
        priority,
        status,
        client: client?.name,
        department,
        module,
        dueDate: dueDate ? new Date(dueDate) : null,
        description,
      }).catch((err) => console.error("[mailer] createIssue failed:", err));
    }
  }

  revalidatePath("/issues");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/issues/${issue.id}?toast=created`);
}

export async function updateIssue(issueId: string, formData: FormData) {
  const session = await requireSession();

  const title = formData.get("title") as string;
  const clientId = (formData.get("clientId") as string) || null;
  const department = (formData.get("department") as string) || null;
  const issueType = (formData.get("issueType") as string) || null;
  const module = (formData.get("module") as string) || null;
  const priority = (formData.get("priority") as IssuePriority) || "medium";
  const status = (formData.get("status") as IssueStatus) || "open";
  const description = (formData.get("description") as string) || null;
  const solution = (formData.get("solution") as string) || null;
  const loggedById = (formData.get("loggedById") as string) || null;
  const assigneeId = (formData.get("assigneeId") as string) || null;
  const dateReported = formData.get("dateReported") as string;
  const dueDate = formData.get("dueDate") as string;

  const customFields: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("custom_")) {
      customFields[key.replace("custom_", "")] = value;
    }
  }

  const existing = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!existing) throw new Error("Issue not found");

  const perms = await getPermissions(session.role);
  if (!perms.canViewAllProjects) {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: existing.projectId, userId: session.userId } },
    });
    if (!membership) throw new Error("Unauthorized");
  }

  const resolvedAt =
    status === "resolved" || status === "closed"
      ? existing.resolvedAt ?? new Date()
      : null;

  await prisma.issue.update({
    where: { id: issueId },
    data: {
      title,
      clientId: clientId || null,
      department,
      issueType,
      module,
      priority,
      status,
      description,
      solution,
      loggedById: loggedById || null,
      assigneeId: assigneeId || null,
      modifiedById: session.userId,
      dateReported: dateReported ? new Date(dateReported) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      resolvedAt,
      lastModifiedAt: new Date(),
      customFields: Object.keys(customFields).length ? customFields as never : undefined,
    },
  });

  const logs: { action: string; oldValue?: string | null; newValue?: string | null }[] = [];

  if (existing.status !== status)
    logs.push({ action: "status_changed", oldValue: existing.status, newValue: status });
  if (existing.priority !== priority)
    logs.push({ action: "priority_changed", oldValue: existing.priority, newValue: priority });
  if ((existing.assigneeId ?? null) !== (assigneeId ?? null)) {
    const [oldAssignee, newAssignee] = await Promise.all([
      existing.assigneeId ? prisma.user.findUnique({ where: { id: existing.assigneeId }, select: { name: true } }) : null,
      assigneeId ? prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true } }) : null,
    ]);
    logs.push({ action: "assignee_changed", oldValue: oldAssignee?.name ?? null, newValue: newAssignee?.name ?? null });
  }
  if (existing.title !== title)
    logs.push({ action: "title_changed", oldValue: existing.title, newValue: title });
  if ((existing.dueDate?.toISOString().split("T")[0] ?? null) !== (dueDate || null))
    logs.push({ action: "duedate_changed", oldValue: existing.dueDate ? existing.dueDate.toISOString().split("T")[0] : null, newValue: dueDate || null });
  if ((existing.description ?? null) !== (description ?? null))
    logs.push({ action: "description_updated" });
  if ((existing.solution ?? null) !== (solution ?? null))
    logs.push({ action: "solution_updated" });

  if (logs.length > 0) {
    await prisma.activityLog.createMany({
      data: logs.map((l) => ({ issueId, userId: session.userId, ...l })),
    });
  }

  // Fetch project/client for email(s) that may need to fire
  const issueWithProject = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      issueNumber: true,
      client: { select: { name: true } },
      project: { select: { name: true, code: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  // Send assignment email if assignee changed to a new person
  const newAssigneeId = assigneeId || null;
  if (newAssigneeId && newAssigneeId !== existing.assigneeId && issueWithProject) {
    const assignee = await prisma.user.findUnique({ where: { id: newAssigneeId }, select: { name: true, email: true } });
    if (assignee?.email) {
      sendAssignmentEmail({
        to: assignee.email,
        assigneeName: assignee.name,
        issueTitle: title,
        issueCode: generateIssueCode(issueWithProject.project.code, issueWithProject.issueNumber),
        issueUrl: `${BASE_URL}/issues/${issueId}`,
        projectName: issueWithProject.project.name,
        priority,
        status,
        client: issueWithProject.client?.name,
        department,
        module,
        dueDate: dueDate ? new Date(dueDate) : null,
        description,
      }).catch((err) => console.error("[mailer] updateIssue assignment failed:", err));
    }
  }

  // Send status-change email to creator when status changes to wait_for_user_check or resolved
  if (existing.status !== status && issueWithProject?.createdBy.email) {
    const emailBase = {
      to: issueWithProject.createdBy.email,
      creatorName: issueWithProject.createdBy.name,
      issueCode: generateIssueCode(issueWithProject.project.code, issueWithProject.issueNumber),
      issueTitle: title,
      issueUrl: `${BASE_URL}/issues/${issueId}`,
      projectName: issueWithProject.project.name,
      priority,
      client: issueWithProject.client?.name,
      department,
      module,
      dueDate: dueDate ? new Date(dueDate) : null,
      solution,
    };
    if (status === "wait_for_user_check") {
      sendWaitForCheckEmail(emailBase).catch((err) => console.error("[mailer] updateIssue waitForCheck failed:", err));
    } else if (status === "resolved") {
      sendResolvedEmail(emailBase).catch((err) => console.error("[mailer] updateIssue resolved failed:", err));
    }
  }

  revalidatePath(`/issues/${issueId}`);
  revalidatePath("/issues");
  redirect(`/issues/${issueId}?toast=updated`);
}

export async function addComment(issueId: string, formData: FormData) {
  const session = await requireSession();
  const content = formData.get("content") as string;
  if (!content?.trim()) return;

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      projectId: true, title: true, issueNumber: true,
      createdBy: { select: { id: true, name: true, email: true } },
      assignee:  { select: { id: true, name: true, email: true } },
      project:   { select: { name: true, code: true } },
    },
  });
  if (!issue) throw new Error("Issue not found");

  const commentPerms = await getPermissions(session.role);
  if (!commentPerms.canViewAllProjects) {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: issue.projectId, userId: session.userId } },
    });
    if (!membership) throw new Error("Unauthorized");
  }

  await prisma.comment.create({
    data: { issueId, userId: session.userId, content },
  });

  await prisma.activityLog.create({
    data: { issueId, userId: session.userId, action: "commented", newValue: content },
  });

  await prisma.issue.update({
    where: { id: issueId },
    data: { lastModifiedAt: new Date(), modifiedById: session.userId },
  });

  // Notify creator, assignee, and the commenter
  const issueCode = generateIssueCode(issue.project.code, issue.issueNumber);
  const issueUrl  = `${BASE_URL}/issues/${issueId}`;
  const commenter = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true } });
  const commenterName = commenter?.name ?? "Someone";

  const recipients = [issue.createdBy, issue.assignee, commenter].filter(
    (u): u is { id: string; name: string; email: string } => u !== null && !!u.email
  );
  // Deduplicate in case creator === assignee
  const seen = new Set<string>();
  for (const recipient of recipients) {
    if (seen.has(recipient.id)) continue;
    seen.add(recipient.id);
    sendCommentEmail({
      to: recipient.email,
      recipientName: recipient.name,
      commenterName,
      issueCode,
      issueTitle: issue.title,
      issueUrl,
      projectName: issue.project.name,
      commentContent: content,
    }).catch((err) => console.error("[mailer] addComment failed:", err));
  }

  revalidatePath(`/issues/${issueId}`);
}

export async function updateIssueStatus(issueId: string, status: IssueStatus) {
  const session = await requireSession();

  const statusPerms = await getPermissions(session.role);
  if (!statusPerms.canViewAllProjects) {
    const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { projectId: true, status: true } });
    if (!issue) throw new Error("Not found");
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: issue.projectId, userId: session.userId } },
    });
    if (!membership) throw new Error("Unauthorized");
  }

  const existing = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      status: true, resolvedAt: true,
      title: true, issueNumber: true, priority: true,
      department: true, module: true, dueDate: true, solution: true,
      client: { select: { name: true } },
      project: { select: { name: true, code: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });
  if (!existing) throw new Error("Not found");

  const resolvedAt =
    status === "resolved" || status === "closed" ? (existing.resolvedAt ?? new Date()) : null;

  await prisma.issue.update({
    where: { id: issueId },
    data: { status, modifiedById: session.userId, lastModifiedAt: new Date(), resolvedAt },
  });

  await prisma.activityLog.create({
    data: { issueId, userId: session.userId, action: "status_changed", oldValue: existing.status, newValue: status },
  });

  if (existing.status !== status && existing.createdBy.email) {
    const emailBase = {
      to: existing.createdBy.email,
      creatorName: existing.createdBy.name,
      issueCode: generateIssueCode(existing.project.code, existing.issueNumber),
      issueTitle: existing.title,
      issueUrl: `${BASE_URL}/issues/${issueId}`,
      projectName: existing.project.name,
      priority: existing.priority,
      client: existing.client?.name,
      department: existing.department,
      module: existing.module,
      dueDate: existing.dueDate,
      solution: existing.solution,
    };
    if (status === "wait_for_user_check") {
      sendWaitForCheckEmail(emailBase).catch((err) => console.error("[mailer] updateIssueStatus waitForCheck failed:", err));
    } else if (status === "resolved") {
      sendResolvedEmail(emailBase).catch((err) => console.error("[mailer] updateIssueStatus resolved failed:", err));
    }
  }

  revalidatePath("/issues");
  revalidatePath(`/issues/${issueId}`);
}

export async function resolveIssue(issueId: string, solution: string) {
  const session = await requireSession();

  const resolvePerms = await getPermissions(session.role);
  if (!resolvePerms.canViewAllProjects) {
    const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { projectId: true, status: true } });
    if (!issue) throw new Error("Not found");
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: issue.projectId, userId: session.userId } },
    });
    if (!membership) throw new Error("Unauthorized");
  }

  const existing = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      status: true, resolvedAt: true,
      title: true, issueNumber: true, priority: true,
      department: true, module: true, dueDate: true,
      client: { select: { name: true } },
      project: { select: { name: true, code: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });
  if (!existing) throw new Error("Not found");

  await prisma.issue.update({
    where: { id: issueId },
    data: {
      status: "wait_for_user_check",
      solution,
      modifiedById: session.userId,
      lastModifiedAt: new Date(),
      resolvedAt: existing.resolvedAt ?? new Date(),
    },
  });

  await prisma.activityLog.create({
    data: { issueId, userId: session.userId, action: "status_changed", oldValue: existing.status, newValue: "wait_for_user_check" },
  });

  if (existing.createdBy.email) {
    sendWaitForCheckEmail({
      to: existing.createdBy.email,
      creatorName: existing.createdBy.name,
      issueCode: generateIssueCode(existing.project.code, existing.issueNumber),
      issueTitle: existing.title,
      issueUrl: `${BASE_URL}/issues/${issueId}`,
      projectName: existing.project.name,
      priority: existing.priority,
      client: existing.client?.name,
      department: existing.department,
      module: existing.module,
      dueDate: existing.dueDate,
      solution,
    }).catch((err) => console.error("[mailer] resolveIssue failed:", err));
  }

  revalidatePath("/issues");
  revalidatePath(`/issues/${issueId}`);
}

export async function updateIssuePriority(issueId: string, priority: IssuePriority) {
  const session = await requireSession();
  const existing = await prisma.issue.findUnique({ where: { id: issueId }, select: { priority: true, projectId: true } });
  if (!existing) throw new Error("Not found");

  const perms = await getPermissions(session.role);
  if (!perms.canViewAllProjects) {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: existing.projectId, userId: session.userId } },
    });
    if (!membership) throw new Error("Unauthorized");
  }
  await prisma.issue.update({
    where: { id: issueId },
    data: { priority, modifiedById: session.userId, lastModifiedAt: new Date() },
  });
  await prisma.activityLog.create({
    data: { issueId, userId: session.userId, action: "priority_changed", oldValue: existing.priority, newValue: priority },
  });
  revalidatePath("/issues");
  revalidatePath(`/issues/${issueId}`);
}

export async function updateIssueAssignee(issueId: string, assigneeId: string | null) {
  const session = await requireSession();
  const existing = await prisma.issue.findUnique({ where: { id: issueId }, select: { assigneeId: true, projectId: true } });
  if (!existing) throw new Error("Not found");

  const perms = await getPermissions(session.role);
  if (!perms.canViewAllProjects) {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: existing.projectId, userId: session.userId } },
    });
    if (!membership) throw new Error("Unauthorized");
  }

  const [oldAssignee, newAssignee, issueWithProject] = await Promise.all([
    existing.assigneeId ? prisma.user.findUnique({ where: { id: existing.assigneeId }, select: { name: true } }) : null,
    assigneeId ? prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true, email: true } }) : null,
    prisma.issue.findUnique({
      where: { id: issueId },
      select: {
        title: true, issueNumber: true, priority: true, status: true,
        department: true, module: true, description: true, dueDate: true,
        client: { select: { name: true } },
        project: { select: { name: true, code: true } },
      },
    }),
  ]);

  await prisma.issue.update({
    where: { id: issueId },
    data: { assigneeId, modifiedById: session.userId, lastModifiedAt: new Date() },
  });
  await prisma.activityLog.create({
    data: { issueId, userId: session.userId, action: "assignee_changed", oldValue: oldAssignee?.name ?? null, newValue: newAssignee?.name ?? null },
  });

  if (assigneeId && assigneeId !== existing.assigneeId && newAssignee?.email && issueWithProject) {
    sendAssignmentEmail({
      to: newAssignee.email,
      assigneeName: newAssignee.name,
      issueTitle: issueWithProject.title,
      issueCode: generateIssueCode(issueWithProject.project.code, issueWithProject.issueNumber),
      issueUrl: `${BASE_URL}/issues/${issueId}`,
      projectName: issueWithProject.project.name,
      priority: issueWithProject.priority,
      status: issueWithProject.status,
      client: issueWithProject.client?.name,
      department: issueWithProject.department,
      module: issueWithProject.module,
      dueDate: issueWithProject.dueDate,
      description: issueWithProject.description,
    }).catch((err) => console.error("[mailer] updateIssueAssignee failed:", err));
  }

  revalidatePath("/issues");
  revalidatePath(`/issues/${issueId}`);
}

export async function updateIssueDueDate(issueId: string, dueDate: string | null) {
  const session = await requireSession();
  const existing = await prisma.issue.findUnique({ where: { id: issueId }, select: { dueDate: true, projectId: true } });
  if (!existing) throw new Error("Not found");

  const perms = await getPermissions(session.role);
  if (!perms.canViewAllProjects) {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: existing.projectId, userId: session.userId } },
    });
    if (!membership) throw new Error("Unauthorized");
  }
  await prisma.issue.update({
    where: { id: issueId },
    data: { dueDate: dueDate ? new Date(dueDate) : null, modifiedById: session.userId, lastModifiedAt: new Date() },
  });
  await prisma.activityLog.create({
    data: {
      issueId,
      userId: session.userId,
      action: "duedate_changed",
      oldValue: existing.dueDate ? existing.dueDate.toISOString().split("T")[0] : null,
      newValue: dueDate,
    },
  });
  revalidatePath("/issues");
  revalidatePath(`/issues/${issueId}`);
}

export async function bulkUpdateStatus(issueIds: string[], status: IssueStatus) {
  const session = await requireSession();

  const bulkPerms = await getPermissions(session.role);
  if (!bulkPerms.canViewAllProjects) {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: session.userId },
      select: { projectId: true },
    });
    const allowedProjectIds = new Set(memberships.map((m) => m.projectId));
    const issues = await prisma.issue.findMany({
      where: { id: { in: issueIds } },
      select: { id: true, projectId: true },
    });
    const unauthorizedIds = issues.filter((i) => !allowedProjectIds.has(i.projectId));
    if (unauthorizedIds.length > 0) throw new Error("Unauthorized");
  }

  await prisma.issue.updateMany({
    where: { id: { in: issueIds } },
    data: { status, modifiedById: session.userId, lastModifiedAt: new Date() },
  });

  for (const id of issueIds) {
    await prisma.activityLog.create({
      data: { issueId: id, userId: session.userId, action: "status_changed", newValue: status },
    });
  }

  revalidatePath("/issues");
}

export async function uploadAttachment(issueId: string, formData: FormData) {
  const session = await requireSession();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;
  if (file.size > MAX_FILE_SIZE) throw new Error("File too large (max 5 MB)");

  const bytes = await file.arrayBuffer();
  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = path.extname(file.name);
  const base = path.basename(file.name, ext).replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `${Date.now()}-${base}${ext}`;
  await writeFile(path.join(UPLOAD_DIR, fileName), Buffer.from(bytes));

  await prisma.attachment.create({
    data: {
      issueId,
      fileName: file.name,
      fileUrl: `/api/uploads/${fileName}`,
      uploadedById: session.userId,
    },
  });

  revalidatePath(`/issues/${issueId}`);
}

export async function deleteAttachment(issueId: string, attachmentId: string) {
  const session = await requireSession();
  const att = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!att) return;

  if (att.uploadedById !== session.userId && !canViewAllProjects(session.role)) {
    throw new Error("Forbidden");
  }

  const fileName = path.basename(att.fileUrl);
  try {
    await unlink(path.join(UPLOAD_DIR, fileName));
  } catch {}

  await prisma.attachment.delete({ where: { id: attachmentId } });
  revalidatePath(`/issues/${issueId}`);
}

export async function deleteComment(commentId: string, issueId: string) {
  const session = await requireSession();
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) return;

  if (comment.userId !== session.userId && !canViewAllProjects(session.role)) {
    throw new Error("Forbidden");
  }

  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath(`/issues/${issueId}`);
}
