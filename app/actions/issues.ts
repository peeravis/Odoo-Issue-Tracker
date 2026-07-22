"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { requireSession } from "@/lib/session";
import { canViewAllProjects, generateIssueCode } from "@/lib/utils";
import { getPermissions } from "@/lib/permissions";
import { sendAssignmentEmail, sendWaitForCheckEmail, sendResolvedEmail, sendCommentEmail } from "@/lib/mailer";
import type { IssuePriority, IssueStatus, SessionPayload } from "@/lib/types";
import { UPLOAD_DIR, MAX_FILE_SIZE, BASE_URL } from "@/lib/constants";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { createIssueSchema, addCommentSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

async function requireProjectAccess(session: SessionPayload, projectId: string) {
  const perms = await getPermissions(session.role);
  if (perms.canViewAllProjects) return;
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: session.userId } },
  });
  if (!membership) throw new ForbiddenError();
}

export async function createIssue(formData: FormData) {
  const session = await requireSession();

  const parsed = createIssueSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    priority: formData.get("priority") || "medium",
    status: formData.get("status") || "open",
    dateReported: formData.get("dateReported") || undefined,
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);

  const { projectId, title, priority, status, dateReported, dueDate } = parsed.data;
  const clientId = (formData.get("clientId") as string) || null;
  const department = (formData.get("department") as string) || null;
  const issueType = (formData.get("issueType") as string) || null;
  const module = (formData.get("module") as string) || null;
  const description = (formData.get("description") as string) || null;
  const solution = (formData.get("solution") as string) || null;
  const loggedById = (formData.get("loggedById") as string) || null;
  const assigneeId = (formData.get("assigneeId") as string) || null;
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
      priority: priority as IssuePriority,
      status: status as IssueStatus,
      description,
      solution,
      createdById: session.userId,
      loggedById: loggedById || undefined,
      assigneeId: assigneeId || undefined,
      dateReported: dateReported ? new Date(dateReported) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      customFields: Object.keys(customFields).length ? customFields as Prisma.InputJsonValue : undefined,
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
        creatorName: session.name,
        creatorEmail: session.email,
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
      }).catch((err: unknown) => logger.error("[mailer] createIssue failed", { error: String(err) }));
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
  if (!existing) throw new NotFoundError("Issue");
  await requireProjectAccess(session, existing.projectId);

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
      customFields: Object.keys(customFields).length ? customFields as Prisma.InputJsonValue : undefined,
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
      assignee: { select: { name: true, email: true } },
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
        creatorName: issueWithProject.createdBy.name,
        creatorEmail: issueWithProject.createdBy.email,
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
      }).catch((err: unknown) => logger.error("[mailer] updateIssue assignment failed", { error: String(err) }));
    }
  }

  // Send status-change email to creator when status changes to wait_for_user_check or resolved
  if (existing.status !== status && issueWithProject?.createdBy.email) {
    const emailBase = {
      to: issueWithProject.createdBy.email,
      creatorName: issueWithProject.createdBy.name,
      creatorEmail: issueWithProject.createdBy.email,
      assigneeName: issueWithProject.assignee?.name,
      assigneeEmail: issueWithProject.assignee?.email,
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
      sendWaitForCheckEmail(emailBase).catch((err: unknown) => logger.error("[mailer] updateIssue waitForCheck failed", { error: String(err) }));
    } else if (status === "resolved") {
      sendResolvedEmail(emailBase).catch((err: unknown) => logger.error("[mailer] updateIssue resolved failed", { error: String(err) }));
    }
  }

  revalidatePath(`/issues/${issueId}`);
  revalidatePath("/issues");
  redirect(`/issues/${issueId}?toast=updated`);
}

export async function addComment(issueId: string, formData: FormData) {
  const session = await requireSession();

  const parsed = addCommentSchema.safeParse({ content: formData.get("content") });
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
  const { content } = parsed.data;

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      projectId: true, title: true, issueNumber: true,
      createdBy: { select: { id: true, name: true, email: true } },
      assignee:  { select: { id: true, name: true, email: true } },
      project:   { select: { name: true, code: true } },
    },
  });
  if (!issue) throw new NotFoundError("Issue");
  await requireProjectAccess(session, issue.projectId);

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
      creatorName: issue.createdBy.name,
      creatorEmail: issue.createdBy.email,
      assigneeName: issue.assignee?.name,
      assigneeEmail: issue.assignee?.email,
      issueCode,
      issueTitle: issue.title,
      issueUrl,
      projectName: issue.project.name,
      commentContent: content,
    }).catch((err: unknown) => logger.error("[mailer] addComment failed", { error: String(err) }));
  }

  revalidatePath(`/issues/${issueId}`);
}

export async function updateIssueStatus(issueId: string, status: IssueStatus) {
  const session = await requireSession();

  const existing = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      projectId: true, status: true, resolvedAt: true,
      title: true, issueNumber: true, priority: true,
      department: true, module: true, dueDate: true, solution: true,
      client: { select: { name: true } },
      project: { select: { name: true, code: true } },
      createdBy: { select: { name: true, email: true } },
      assignee: { select: { name: true, email: true } },
    },
  });
  if (!existing) throw new NotFoundError("Issue");
  await requireProjectAccess(session, existing.projectId);

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
      creatorEmail: existing.createdBy.email,
      assigneeName: existing.assignee?.name,
      assigneeEmail: existing.assignee?.email,
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
      sendWaitForCheckEmail(emailBase).catch((err: unknown) => logger.error("[mailer] updateIssueStatus waitForCheck failed", { error: String(err) }));
    } else if (status === "resolved") {
      sendResolvedEmail(emailBase).catch((err: unknown) => logger.error("[mailer] updateIssueStatus resolved failed", { error: String(err) }));
    }
  }

  revalidatePath("/issues");
  revalidatePath(`/issues/${issueId}`);
}

export async function resolveIssue(issueId: string, solution: string) {
  const session = await requireSession();

  const existing = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      projectId: true, status: true, resolvedAt: true,
      title: true, issueNumber: true, priority: true,
      department: true, module: true, dueDate: true,
      client: { select: { name: true } },
      project: { select: { name: true, code: true } },
      createdBy: { select: { name: true, email: true } },
      assignee: { select: { name: true, email: true } },
    },
  });
  if (!existing) throw new NotFoundError("Issue");
  await requireProjectAccess(session, existing.projectId);

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
      creatorEmail: existing.createdBy.email,
      assigneeName: existing.assignee?.name,
      assigneeEmail: existing.assignee?.email,
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
    }).catch((err: unknown) => logger.error("[mailer] resolveIssue failed", { error: String(err) }));
  }

  revalidatePath("/issues");
  revalidatePath(`/issues/${issueId}`);
}

export async function updateIssuePriority(issueId: string, priority: IssuePriority) {
  const session = await requireSession();
  const existing = await prisma.issue.findUnique({ where: { id: issueId }, select: { priority: true, projectId: true } });
  if (!existing) throw new NotFoundError("Issue");
  await requireProjectAccess(session, existing.projectId);
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
  if (!existing) throw new NotFoundError("Issue");
  await requireProjectAccess(session, existing.projectId);

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
        createdBy: { select: { name: true, email: true } },
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
      creatorName: issueWithProject.createdBy.name,
      creatorEmail: issueWithProject.createdBy.email,
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
    }).catch((err: unknown) => logger.error("[mailer] updateIssueAssignee failed", { error: String(err) }));
  }

  revalidatePath("/issues");
  revalidatePath(`/issues/${issueId}`);
}

export async function updateIssueDueDate(issueId: string, dueDate: string | null) {
  const session = await requireSession();
  const existing = await prisma.issue.findUnique({ where: { id: issueId }, select: { dueDate: true, projectId: true } });
  if (!existing) throw new NotFoundError("Issue");
  await requireProjectAccess(session, existing.projectId);
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
    if (unauthorizedIds.length > 0) throw new ForbiddenError();
  }

  await prisma.issue.updateMany({
    where: { id: { in: issueIds } },
    data: { status, modifiedById: session.userId, lastModifiedAt: new Date() },
  });

  await prisma.activityLog.createMany({
    data: issueIds.map((issueId) => ({
      issueId,
      userId: session.userId,
      action: "status_changed",
      newValue: status,
    })),
  });

  revalidatePath("/issues");
}

export async function uploadAttachment(issueId: string, formData: FormData) {
  const session = await requireSession();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;
  if (file.size > MAX_FILE_SIZE) throw new ValidationError("ไฟล์ใหญ่เกินไป (สูงสุด 5 MB)");

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
    throw new ForbiddenError();
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
    throw new ForbiddenError();
  }

  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath(`/issues/${issueId}`);
}
