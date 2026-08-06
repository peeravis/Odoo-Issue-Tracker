import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { format } from "date-fns";
import {
  BUG_PRIORITY_LABELS,
  BUG_STATUS_LABELS,
  type BugReportPriority,
  type BugReportStatusType,
} from "@/lib/report-bug";

export async function GET(request: NextRequest) {
  const session = await decrypt(request.cookies.get("session")?.value);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const reports = await prisma.bugReport.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      submittedBy: { select: { name: true, email: true } },
      attachments: { select: { fileName: true } },
    },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Bug Reports");

  const headers = ["#", "Title", "Description", "Priority", "Status", "Submitted By", "Email", "Attachments", "Created At", "Updated At"];
  const headerRow = sheet.addRow(headers);

  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  sheet.views = [{ state: "frozen", ySplit: 1 }];

  reports.forEach((r, i) => {
    const row = sheet.addRow([
      i + 1,
      r.title,
      r.description ?? "",
      BUG_PRIORITY_LABELS[r.priority as BugReportPriority] ?? r.priority,
      BUG_STATUS_LABELS[r.status as BugReportStatusType] ?? r.status,
      r.submittedBy.name,
      r.submittedBy.email,
      r.attachments.map((a) => a.fileName).join(", "),
      format(r.createdAt, "yyyy-MM-dd HH:mm"),
      format(r.updatedAt, "yyyy-MM-dd HH:mm"),
    ]);

    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  });

  sheet.columns.forEach((col) => {
    if (!col) return;
    let maxLen = 10;
    col?.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 4, 60);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = format(new Date(), "yyyyMMdd");
  const filename = `bug-reports_${dateStr}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
