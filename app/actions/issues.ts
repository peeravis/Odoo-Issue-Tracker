"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isMemberRole, canViewAllProjects, generateIssueCode } from "@/lib/utils";
import { sendAssignmentEmail } from "@/lib/mailer";
import type { IssuePriority, IssueStatus } from "@/lib/types";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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
    const [assignee, project] = await Promise.all([
      prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true, email: true } }),
      prisma.project.findUnique({ where: { id: projectId }, select: { name: true, code: true } }),
    ]);
    if (assignee?.email && project) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
      sendAssignmentEmail({
        to: assignee.email,
        assigneeName: assignee.name,
        issueTitle: title,
        issueCode: generateIssueCode(project.code, issueNumber),
        issueUrl: `${baseUrl}/issues/${issue.id}`,
        projectName: project.name,
      }).catch(() => {}); // Non-blocking
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

  if (isMemberRole(session.role)) {
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

  if (existing.status !== status) {
    await prisma.activityLog.create({
      data: {
        issueId,
        userId: session.userId,
        action: "status_changed",
        oldValue: existing.status,
        newValue: status,
      },
    });
  }

  // Send email if assignee changed to a new person
  const newAssigneeId = assigneeId || null;
  if (newAssigneeId && newAssigneeId !== existing.assigneeId) {
    const [assignee, issueWithProject] = await Promise.all([
      prisma.user.findUnique({ where: { id: newAssigneeId }, select: { name: true, email: true } }),
      prisma.issue.findUnique({
        where: { id: issueId },
        select: { issueNumber: true, project: { select: { name: true, code: true } } },
      }),
    ]);
    if (assignee?.email && issueWithProject) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
      sendAssignmentEmail({
        to: assignee.email,
        assigneeName: assignee.name,
        issueTitle: title,
        issueCode: generateIssueCode(issueWithProject.project.code, issueWithProject.issueNumber),
        issueUrl: `${baseUrl}/issues/${issueId}`,
        projectName: issueWithProject.project.name,
      }).catch(() => {});
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

  if (isMemberRole(session.role)) {
    const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { projectId: true } });
    if (!issue) throw new Error("Issue not found");
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

  revalidatePath(`/issues/${issueId}`);
}

export async function updateIssueStatus(issueId: string, status: IssueStatus) {
  const session = await requireSession();

  if (isMemberRole(session.role)) {
    const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { projectId: true, status: true } });
    if (!issue) throw new Error("Not found");
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: issue.projectId, userId: session.userId } },
    });
    if (!membership) throw new Error("Unauthorized");
  }

  const existing = await prisma.issue.findUnique({ where: { id: issueId }, select: { status: true, resolvedAt: true } });
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

  revalidatePath("/issues");
  revalidatePath(`/issues/${issueId}`);
}

export async function bulkUpdateStatus(issueIds: string[], status: IssueStatus) {
  const session = await requireSession();

  if (isMemberRole(session.role)) {
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
  if (file.size > MAX_FILE_SIZE) throw new Error("File too large (max 10 MB)");

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
