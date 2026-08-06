"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_ATTACHMENT_TYPES } from "@/lib/constants";
import { BUG_REPORT_PRIORITIES, BUG_REPORT_STATUSES, type BugReportStatusType } from "@/lib/report-bug";

async function saveAttachmentFiles(files: File[], reportId: string) {
  const saved: { fileName: string; fileUrl: string }[] = [];
  const reportUploadDir = path.join(UPLOAD_DIR, "bug-reports");
  await mkdir(reportUploadDir, { recursive: true });

  for (const file of files) {
    if (!file || file.size === 0) continue;
    if (file.size > MAX_FILE_SIZE) throw new ValidationError(`ไฟล์ ${file.name} ใหญ่เกิน 5 MB`);
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) throw new ValidationError(`ไฟล์ ${file.name} ประเภทไม่รองรับ`);

    const ext = path.extname(file.name);
    const safeName = `${reportId}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    await writeFile(path.join(reportUploadDir, safeName), Buffer.from(await file.arrayBuffer()));
    saved.push({ fileName: file.name, fileUrl: `/api/uploads/bug-reports/${safeName}` });
  }
  return saved;
}

export async function submitBugReport(formData: FormData) {
  const session = await requireSession();

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const priority = (formData.get("priority") as string) || "medium";

  if (!title) throw new ValidationError("Title ห้ามว่าง");
  if (!BUG_REPORT_PRIORITIES.includes(priority as typeof BUG_REPORT_PRIORITIES[number])) {
    throw new ValidationError("Priority ไม่ถูกต้อง");
  }

  const report = await prisma.bugReport.create({
    data: {
      title,
      description,
      priority,
      status: "open",
      submittedById: session.userId,
    },
  });

  const files = formData.getAll("attachments") as File[];
  const savedFiles = await saveAttachmentFiles(files, report.id);
  if (savedFiles.length > 0) {
    await prisma.bugReportAttachment.createMany({
      data: savedFiles.map((f) => ({ reportId: report.id, ...f })),
    });
  }

  redirect(`/report-bug/${report.id}`);
}

export async function updateBugReportStatus(reportId: string, status: string) {
  const session = await requireSession();
  if (session.role !== "admin") throw new ForbiddenError();
  if (!BUG_REPORT_STATUSES.includes(status as BugReportStatusType)) {
    throw new ValidationError("Status ไม่ถูกต้อง");
  }

  await prisma.bugReport.update({
    where: { id: reportId },
    data: { status: status as BugReportStatusType },
  });

  revalidatePath(`/report-bug/${reportId}`);
  revalidatePath("/report-bug");
}

export async function deleteBugReport(reportId: string) {
  const session = await requireSession();

  const report = await prisma.bugReport.findUnique({ where: { id: reportId } });
  if (!report) throw new NotFoundError("Report ไม่พบ");
  if (session.role !== "admin" && report.submittedById !== session.userId) {
    throw new ForbiddenError();
  }

  await prisma.bugReport.delete({ where: { id: reportId } });
  redirect("/report-bug");
}
