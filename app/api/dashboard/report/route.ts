import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { generateIssueCode, STATUS_LABELS, PRIORITY_LABELS, canViewAllProjects } from "@/lib/utils";
import { drawBarChart, drawDonutChart } from "@/lib/excel-charts";
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

  const isDaily = sp.get("daily") === "1";
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const projectFilterForPending = {
    projectId: baseWhere.projectId as string | { in: string[] },
    status: { in: ["open", "in_progress", "wait_for_user_check", "reopened"] as IssueStatus[] },
  };

  const [issues, statusCounts, totalAllCount, todayByStatus, pendingByStatus, todayResolvedCount] = await Promise.all([
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
    prisma.issue.groupBy({ by: ["status"], where: baseWhere, _count: true }),
    prisma.issue.count({ where: { projectId: baseWhere.projectId as string | { in: string[] } } }),
    isDaily ? prisma.issue.groupBy({ by: ["status"], where: { projectId: baseWhere.projectId as string | { in: string[] }, createdAt: { gte: todayStart } }, _count: true }) : Promise.resolve([]),
    isDaily ? prisma.issue.groupBy({ by: ["status"], where: projectFilterForPending, _count: true }) : Promise.resolve([]),
    isDaily ? prisma.issue.count({ where: { projectId: baseWhere.projectId as string | { in: string[] }, resolvedAt: { gte: todayStart } } }) : Promise.resolve(0),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Issue Log Tracker";
  workbook.created = new Date();

  // ── Sheet 0: Daily Report (only when daily=1) ─────────────────────────────
  if (isDaily) {
    const todayNewCount = todayByStatus.reduce((s, r) => s + r._count, 0);
    const pendingTotal  = pendingByStatus.reduce((s, r) => s + r._count, 0);
    const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "0%");
    const todayLabel = format(new Date(), "yyyy-MM-dd");

    const daily = workbook.addWorksheet("Daily Report");

    const title = daily.addRow([`Daily Report — ${todayLabel}`]);
    title.getCell(1).font = { bold: true, size: 16, color: { argb: "FF4F46E5" } };
    daily.addRow(["Export เมื่อ:", format(new Date(), "yyyy-MM-dd HH:mm")]);
    daily.addRow([]);

    // Section 1: Summary
    const sec1 = daily.addRow(["สรุปภาพรวมวันนี้"]);
    sec1.getCell(1).font = { bold: true, size: 12 };
    const sec1hdr = daily.addRow(["รายการ", "จำนวน (เคส)", "% ของทั้งหมด"]);
    sec1hdr.eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
      c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      c.alignment = { horizontal: "center" };
    });
    const rows1 = [
      ["เคสที่เปิดวันนี้",   todayNewCount,      pct(todayNewCount, totalAllCount)],
      ["เคสค้างอยู่ทั้งหมด", pendingTotal,        pct(pendingTotal, totalAllCount)],
      ["Resolve วันนี้",      todayResolvedCount, pct(todayResolvedCount, totalAllCount)],
      ["เคสทั้งหมด",          totalAllCount,      "100%"],
    ];
    rows1.forEach(([label, count, percent]) => {
      const r = daily.addRow([label, count, percent]);
      r.getCell(2).alignment = { horizontal: "center" };
      r.getCell(3).alignment = { horizontal: "center" };
    });
    daily.addRow([]);

    // Section 2: Today's cases by status
    const sec2 = daily.addRow(["เคสที่เปิดวันนี้ แยกตาม Status"]);
    sec2.getCell(1).font = { bold: true, size: 12 };
    const sec2hdr = daily.addRow(["Status", "จำนวน", "% ของวันนี้", "% ของทั้งหมด"]);
    sec2hdr.eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
      c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      c.alignment = { horizontal: "center" };
    });
    for (const s of STATUS_ORDER) {
      const cnt = todayByStatus.find((r) => r.status === s)?._count ?? 0;
      if (cnt === 0) continue;
      const r = daily.addRow([STATUS_LABELS[s], cnt, pct(cnt, todayNewCount), pct(cnt, totalAllCount)]);
      r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_COLORS[s] + "33" } };
      r.getCell(1).font = { bold: true, color: { argb: STATUS_COLORS[s] } };
      [2, 3, 4].forEach((col) => (r.getCell(col).alignment = { horizontal: "center" }));
    }
    daily.addRow([]);

    // Section 3: Pending/remaining by status
    const sec3 = daily.addRow(["เคสค้างอยู่ แยกตาม Status"]);
    sec3.getCell(1).font = { bold: true, size: 12 };
    const sec3hdr = daily.addRow(["Status", "จำนวน", "% ของค้างทั้งหมด", "% ของเคสทั้งหมด"]);
    sec3hdr.eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB45309" } };
      c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      c.alignment = { horizontal: "center" };
    });
    for (const s of STATUS_ORDER) {
      const cnt = pendingByStatus.find((r) => r.status === s)?._count ?? 0;
      if (cnt === 0) continue;
      const r = daily.addRow([STATUS_LABELS[s], cnt, pct(cnt, pendingTotal), pct(cnt, totalAllCount)]);
      r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_COLORS[s] + "33" } };
      r.getCell(1).font = { bold: true, color: { argb: STATUS_COLORS[s] } };
      [2, 3, 4].forEach((col) => (r.getCell(col).alignment = { horizontal: "center" }));
    }
    daily.addRow([]);
    const totalRow = daily.addRow(["รวมค้างทั้งหมด", pendingTotal, "100%", pct(pendingTotal, totalAllCount)]);
    totalRow.eachCell((c) => { c.font = { bold: true }; c.alignment = { horizontal: "center" }; });
    totalRow.getCell(1).alignment = { horizontal: "left" };

    daily.getColumn(1).width = 30;
    daily.getColumn(2).width = 16;
    daily.getColumn(3).width = 18;
    daily.getColumn(4).width = 18;

    // ── Daily Charts ─────────────────────────────────────────────────────────
    const toChartColor = (argb: string) => "#" + argb.slice(2);

    const todayChartItems = STATUS_ORDER
      .map((s) => ({ label: STATUS_LABELS[s], value: todayByStatus.find((r) => r.status === s)?._count ?? 0, color: toChartColor(STATUS_COLORS[s]) }))
      .filter((d) => d.value > 0);

    const pendingChartItems = STATUS_ORDER
      .map((s) => ({ label: STATUS_LABELS[s], value: pendingByStatus.find((r) => r.status === s)?._count ?? 0, color: toChartColor(STATUS_COLORS[s]) }))
      .filter((d) => d.value > 0);

    if (todayChartItems.length > 0) {
      const buf = drawBarChart({
        title: `เคสที่เปิดวันนี้ — ${todayLabel}`,
        labels: todayChartItems.map((d) => d.label),
        values: todayChartItems.map((d) => d.value),
        colors: todayChartItems.map((d) => d.color),
        total: totalAllCount,
      });
      const imgId = workbook.addImage({ buffer: buf, extension: "png" });
      daily.addImage(imgId, "F3:O24");
    }

    if (pendingChartItems.length > 0) {
      const buf = drawBarChart({
        title: `เคสค้างอยู่ — ${pendingTotal} เคส`,
        labels: pendingChartItems.map((d) => d.label),
        values: pendingChartItems.map((d) => d.value),
        colors: pendingChartItems.map((d) => d.color),
        total: totalAllCount,
      });
      const imgId = workbook.addImage({ buffer: buf, extension: "png" });
      daily.addImage(imgId, "P3:Y24");
    }
  }

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

  // ── Summary Chart ─────────────────────────────────────────────────────────
  const summaryChartItems = STATUS_ORDER
    .map((s) => ({ label: STATUS_LABELS[s], value: statusCounts.find((c) => c.status === s)?._count ?? 0, color: "#" + STATUS_COLORS[s].slice(2) }))
    .filter((d) => d.value > 0);

  if (summaryChartItems.length > 0) {
    const buf = drawDonutChart({
      title: "Issues by Status",
      labels: summaryChartItems.map((d) => d.label),
      values: summaryChartItems.map((d) => d.value),
      colors: summaryChartItems.map((d) => d.color),
    });
    const imgId = workbook.addImage({ buffer: buf, extension: "png" });
    summarySheet.addImage(imgId, "E1:N18");
  }

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
