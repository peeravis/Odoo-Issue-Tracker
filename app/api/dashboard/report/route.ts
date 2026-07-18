import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { generateIssueCode, STATUS_LABELS, PRIORITY_LABELS, canViewAllProjects } from "@/lib/utils";
import { format } from "date-fns";
import type { IssueStatus } from "@/lib/types";

const STATUS_ORDER: IssueStatus[] = ["open", "in_progress", "wait_for_user_check", "resolved", "closed", "reopened"];

const STATUS_COLORS: Record<IssueStatus, string> = {
  open: "FF3B82F6",
  in_progress: "FFA855F7",
  wait_for_user_check: "FFF97316",
  resolved: "FF10B981",
  closed: "FF94A3B8",
  reopened: "FFF43F5E",
};

export async function GET(request: NextRequest) {
  const session = await decrypt(request.cookies.get("session")?.value);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const sp = request.nextUrl.searchParams;
  const projectId = sp.get("projectId");
  const fromDate = sp.get("from");
  const toDate = sp.get("to");

  const userProjects = canViewAllProjects(session.role)
    ? await prisma.project.findMany({ select: { id: true, name: true, code: true } })
    : await prisma.projectMember
        .findMany({ where: { userId: session.userId }, select: { projectId: true } })
        .then(async (m) => {
          const ids = m.map((x) => x.projectId);
          return prisma.project.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, code: true } });
        });

  const projectIds = userProjects.map((p) => p.id);

  const baseWhere: Record<string, unknown> = {
    projectId: projectId && projectIds.includes(projectId) ? projectId : { in: projectIds },
  };

  if (fromDate || toDate) {
    baseWhere.createdAt = {
      ...(fromDate ? { gte: new Date(fromDate) } : {}),
      ...(toDate ? { lte: new Date(toDate + "T23:59:59.999Z") } : {}),
    };
  }

  const [issues, statusCounts] = await Promise.all([
    prisma.issue.findMany({
      where: baseWhere,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        project: { select: { code: true, name: true } },
        client: { select: { name: true } },
        assignee: { select: { name: true } },
        createdBy: { select: { name: true } },
        loggedBy: { select: { name: true } },
      },
    }),
    prisma.issue.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: true,
    }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Issue Log Tracker";
  workbook.created = new Date();

  // ── Sheet 1: Summary ─────────────────────────────────────────────────────────
  const summarySheet = workbook.addWorksheet("Summary");

  const titleRow = summarySheet.addRow(["Issue Status Report"]);
  titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: "FF4F46E5" } };
  summarySheet.addRow([]);

  const rangeLabel =
    fromDate && toDate
      ? `${fromDate} ถึง ${toDate}`
      : fromDate
      ? `ตั้งแต่ ${fromDate}`
      : toDate
      ? `ถึง ${toDate}`
      : "ทั้งหมด";

  summarySheet.addRow(["ช่วงวันที่:", rangeLabel]);
  summarySheet.addRow(["Export เมื่อ:", format(new Date(), "yyyy-MM-dd HH:mm")]);
  summarySheet.addRow([]);

  const summaryHeader = summarySheet.addRow(["Status", "จำนวน (issues)", "% ของทั้งหมด"]);
  summaryHeader.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  });

  const total = issues.length;
  for (const status of STATUS_ORDER) {
    const count = statusCounts.find((s) => s.status === status)?._count ?? 0;
    if (count === 0) continue;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const row = summarySheet.addRow([STATUS_LABELS[status], count, `${pct}%`]);
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_COLORS[status] + "33" } };
    row.getCell(1).font = { bold: true, color: { argb: STATUS_COLORS[status] } };
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(3).alignment = { horizontal: "center" };
  }

  summarySheet.addRow([]);
  const totalRow = summarySheet.addRow(["รวมทั้งหมด", total, "100%"]);
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.alignment = { horizontal: "center" };
  });
  totalRow.getCell(1).alignment = { horizontal: "left" };

  summarySheet.getColumn(1).width = 26;
  summarySheet.getColumn(2).width = 18;
  summarySheet.getColumn(3).width = 16;

  // ── Sheet 2: Issues Detail ────────────────────────────────────────────────────
  const detailSheet = workbook.addWorksheet("Issues Detail");

  const headers = ["#", "Issue ID", "Title", "Project", "Client", "Priority", "Status", "Assignee", "Logged By", "Created", "Created At"];
  const headerRow = detailSheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
  });
  headerRow.height = 30;

  issues.forEach((issue, idx) => {
    const row = detailSheet.addRow([
      idx + 1,
      generateIssueCode(issue.project.code, issue.issueNumber),
      issue.title,
      issue.project.name,
      issue.client?.name ?? "-",
      PRIORITY_LABELS[issue.priority],
      STATUS_LABELS[issue.status],
      issue.assignee?.name ?? "-",
      issue.loggedBy?.name ?? issue.createdBy.name,
      issue.createdBy.name,
      format(new Date(issue.createdAt), "yyyy-MM-dd HH:mm"),
    ]);

    row.getCell(7).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: STATUS_COLORS[issue.status] + "22" },
    };
    row.getCell(7).font = { color: { argb: STATUS_COLORS[issue.status] }, bold: true };
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", wrapText: false };
      if (Number(cell.col) !== 3) cell.alignment = { ...cell.alignment, horizontal: "center" };
    });
    row.getCell(3).alignment = { vertical: "middle", horizontal: "left" };
  });

  const colWidths = [5, 14, 50, 20, 18, 12, 22, 20, 20, 20, 18];
  colWidths.forEach((w, i) => { detailSheet.getColumn(i + 1).width = w; });
  detailSheet.getRow(1).height = 30;

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = format(new Date(), "yyyyMMdd");
  const filename = `dashboard-report_${dateStr}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
