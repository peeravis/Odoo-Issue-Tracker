import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { generateIssueCode, STATUS_LABELS, PRIORITY_LABELS, canViewAllProjects } from "@/lib/utils";
import { format } from "date-fns";
import type { IssueStatus } from "@/lib/types";

const STATUS_ORDER: IssueStatus[] = ["open", "in_progress", "wait_for_user_check", "resolved", "closed", "reopened"];
const PRIORITY_ORDER = ["critical", "high", "medium", "low"];

const C = {
  navyDark:     "FF0A1628",
  navy:         "FF1B3A5C",
  navyMid:      "FF254E7A",
  white:        "FFFFFFFF",
  gray50:       "FFF8FAFC",
  gray100:      "FFF1F5F9",
  gray200:      "FFE2E8F0",
  gray300:      "FFCBD5E1",
  gray400:      "FF94A3B8",
  gray500:      "FF64748B",
  gray700:      "FF334155",
  indigo:       "FF4F46E5",
  indigoLight:  "FFE0E7FF",
  indigoXLight: "FFEFEDFF",
} as const;

const STATUS_PALETTE: Record<IssueStatus, { dark: string; light: string }> = {
  open:                { dark: "FF2563EB", light: "FFDBEAFE" },
  in_progress:         { dark: "FF9333EA", light: "FFF3E8FF" },
  wait_for_user_check: { dark: "FFEA580C", light: "FFFFEDD5" },
  resolved:            { dark: "FF059669", light: "FFD1FAE5" },
  closed:              { dark: "FF64748B", light: "FFF1F5F9" },
  reopened:            { dark: "FFE11D48", light: "FFFFE4E6" },
};

const PRIORITY_PALETTE: Record<string, { dark: string; light: string }> = {
  critical: { dark: "FFDC2626", light: "FFFEE2E2" },
  high:     { dark: "FFEA580C", light: "FFFFEDD5" },
  medium:   { dark: "FFD97706", light: "FFFEF3C7" },
  low:      { dark: "FF16A34A", light: "FFDCFCE7" },
};

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "–");

function setFill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function setBorder(cell: ExcelJS.Cell, style: ExcelJS.BorderStyle = "thin", argb: string = C.gray200) {
  cell.border = {
    top:    { style, color: { argb } },
    left:   { style, color: { argb } },
    bottom: { style, color: { argb } },
    right:  { style, color: { argb } },
  };
}

function addSpacer(ws: ExcelJS.Worksheet, height = 12) {
  ws.addRow([]).height = height;
}

function addSectionHeader(ws: ExcelJS.Worksheet, label: string, numCols: number) {
  const row = ws.addRow([label]);
  const rn = row.number;
  ws.mergeCells(rn, 1, rn, numCols);
  row.height = 28;
  const cell = row.getCell(1);
  setFill(cell, C.indigoXLight);
  cell.font = { bold: true, size: 11, color: { argb: C.indigo }, name: "Calibri" };
  cell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  cell.border = {
    top:    { style: "medium", color: { argb: C.indigo } },
    left:   { style: "medium", color: { argb: C.indigo } },
    right:  { style: "medium", color: { argb: C.indigo } },
    bottom: { style: "thin",   color: { argb: C.indigoLight } },
  };
}

function styleTableHeader(row: ExcelJS.Row, numCols: number) {
  row.height = 26;
  for (let col = 1; col <= numCols; col++) {
    const c = row.getCell(col);
    setFill(c, C.navy);
    c.font = { bold: true, size: 10, color: { argb: C.white }, name: "Calibri" };
    c.alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle", indent: col === 1 ? 1 : 0 };
    setBorder(c, "thin", C.navyMid);
  }
}

export async function GET(request: NextRequest) {
  const session = await decrypt(request.cookies.get("session")?.value);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const sp = request.nextUrl.searchParams;
  const projectId = sp.get("projectId");
  const fromDate  = sp.get("from");
  const toDate    = sp.get("to");

  const userProjects = canViewAllProjects(session.role)
    ? await prisma.project.findMany({ select: { id: true, name: true, code: true } })
    : await prisma.projectMember
        .findMany({ where: { userId: session.userId }, select: { projectId: true } })
        .then(async (m) => {
          const ids = m.map((x) => x.projectId);
          return prisma.project.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, code: true } });
        });

  const projectIds = userProjects.map((p) => p.id);
  const baseProjectFilter = projectId && projectIds.includes(projectId)
    ? projectId
    : { in: projectIds };

  const baseWhere: Record<string, unknown> = { projectId: baseProjectFilter };
  if (fromDate || toDate) {
    baseWhere.createdAt = {
      ...(fromDate ? { gte: new Date(fromDate) }                        : {}),
      ...(toDate   ? { lte: new Date(toDate + "T23:59:59.999Z") }       : {}),
    };
  }

  const pendingStatuses: IssueStatus[] = ["open", "in_progress", "wait_for_user_check", "reopened"];

  const [issues, statusCounts, totalAllCount, pendingByStatus] = await Promise.all([
    prisma.issue.findMany({
      where: baseWhere,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        project:   { select: { id: true, code: true, name: true } },
        client:    { select: { name: true } },
        assignee:  { select: { name: true } },
        createdBy: { select: { name: true } },
        loggedBy:  { select: { name: true } },
      },
    }),
    prisma.issue.groupBy({ by: ["status"], where: baseWhere, _count: true }),
    prisma.issue.count({ where: { projectId: baseProjectFilter } }),
    prisma.issue.groupBy({
      by: ["status"],
      where: { projectId: baseProjectFilter, status: { in: pendingStatuses } },
      _count: true,
    }),
  ]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const totalInPeriod    = issues.length;
  const pendingTotal     = pendingByStatus.reduce((s, r) => s + r._count, 0);
  const resolvedInPeriod = statusCounts.find((s) => s.status === "resolved")?._count ?? 0;

  const priorityMap  = new Map<string, number>();
  const projectMap   = new Map<string, { name: string; count: number }>();
  const assigneeMap  = new Map<string, { name: string; count: number }>();

  for (const issue of issues) {
    priorityMap.set(issue.priority, (priorityMap.get(issue.priority) ?? 0) + 1);

    if (!projectMap.has(issue.project.id)) {
      projectMap.set(issue.project.id, { name: issue.project.name, count: 0 });
    }
    projectMap.get(issue.project.id)!.count++;

    const aKey  = issue.assignee?.name ?? "__none__";
    const aName = issue.assignee?.name ?? "(Unassigned)";
    if (!assigneeMap.has(aKey)) assigneeMap.set(aKey, { name: aName, count: 0 });
    assigneeMap.get(aKey)!.count++;
  }

  const projectBreakdown  = [...projectMap.values()].sort((a, b) => b.count - a.count);
  const assigneeBreakdown = [...assigneeMap.values()].sort((a, b) => b.count - a.count).slice(0, 15);

  const rangeLabel =
    fromDate && toDate ? `${fromDate}  —  ${toDate}` :
    fromDate           ? `ตั้งแต่ ${fromDate}`        :
    toDate             ? `ถึง ${toDate}`               :
                         "ทั้งหมด (All Time)";

  const exportedAt = format(new Date(), "dd/MM/yyyy HH:mm");
  const NUM_COLS = 5;

  // ════════════════════════════════════════════════════════════════════════════
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Issue Log Tracker";
  workbook.created = new Date();

  // ══ Sheet 1: Executive Summary ══════════════════════════════════════════════
  const ws = workbook.addWorksheet("Executive Summary", {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.columns = [
    { width: 34 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 20 },
  ];

  // ── Title banner ─────────────────────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, NUM_COLS);
  ws.getRow(1).height = 54;
  {
    const c = ws.getCell(1, 1);
    c.value = "  ISSUE LOG REPORT";
    c.font = { bold: true, size: 26, color: { argb: C.white }, name: "Calibri" };
    setFill(c, C.navy);
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  ws.mergeCells(2, 1, 2, NUM_COLS);
  ws.getRow(2).height = 24;
  {
    const c = ws.getCell(2, 1);
    c.value = `  ช่วงข้อมูล: ${rangeLabel}`;
    c.font = { size: 12, color: { argb: "FFCBD5E1" }, name: "Calibri" };
    setFill(c, C.navyMid);
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  ws.mergeCells(3, 1, 3, NUM_COLS);
  ws.getRow(3).height = 18;
  {
    const c = ws.getCell(3, 1);
    c.value = `  Export: ${exportedAt}  |  Issue Log Tracker`;
    c.font = { size: 9, color: { argb: C.gray400 }, name: "Calibri" };
    setFill(c, C.navyDark);
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  addSpacer(ws, 14);

  // ── KEY METRICS ──────────────────────────────────────────────────────────────
  addSectionHeader(ws, "  📊  KEY METRICS", NUM_COLS);

  {
    const hdr = ws.addRow(["Metric", "จำนวน", "% ของทั้งหมด", "% ของช่วง", "หมายเหตุ"]);
    styleTableHeader(hdr, NUM_COLS);
  }

  const kpiItems = [
    {
      label: "Issues ในช่วงที่เลือก",
      value: totalInPeriod,
      pctAll: pct(totalInPeriod, totalAllCount),
      pctPeriod: "100%",
      note: rangeLabel,
      dark: "FF2563EB", light: "FFDBEAFE",
    },
    {
      label: "Issues ค้างอยู่ (Pending)",
      value: pendingTotal,
      pctAll: pct(pendingTotal, totalAllCount),
      pctPeriod: pct(pendingTotal, totalInPeriod),
      note: "Open / In Progress / Wait / Reopened",
      dark: "FFEA580C", light: "FFFFEDD5",
    },
    {
      label: "Resolved ในช่วงที่เลือก",
      value: resolvedInPeriod,
      pctAll: pct(resolvedInPeriod, totalAllCount),
      pctPeriod: pct(resolvedInPeriod, totalInPeriod),
      note: "ของ Issues ในช่วง",
      dark: "FF059669", light: "FFD1FAE5",
    },
    {
      label: "Issues ทั้งหมด (All Time)",
      value: totalAllCount,
      pctAll: "100%",
      pctPeriod: "–",
      note: "ทุก Project ที่เข้าถึงได้",
      dark: C.gray500, light: C.gray100,
    },
  ];

  for (const item of kpiItems) {
    const row = ws.addRow([item.label, item.value, item.pctAll, item.pctPeriod, item.note]);
    row.height = 26;

    setFill(row.getCell(1), item.light);
    row.getCell(1).font = { bold: true, size: 10, color: { argb: item.dark }, name: "Calibri" };
    row.getCell(1).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    setBorder(row.getCell(1));

    setFill(row.getCell(2), item.light);
    row.getCell(2).font = { bold: true, size: 18, color: { argb: item.dark }, name: "Calibri" };
    row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    setBorder(row.getCell(2));

    for (const col of [3, 4]) {
      setFill(row.getCell(col), C.gray50);
      row.getCell(col).font = { bold: true, size: 10, color: { argb: item.dark }, name: "Calibri" };
      row.getCell(col).alignment = { horizontal: "center", vertical: "middle" };
      setBorder(row.getCell(col));
    }

    setFill(row.getCell(5), C.gray50);
    row.getCell(5).font = { size: 9, color: { argb: C.gray500 }, italic: true, name: "Calibri" };
    row.getCell(5).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    setBorder(row.getCell(5));
  }

  addSpacer(ws);

  // ── STATUS BREAKDOWN ─────────────────────────────────────────────────────────
  addSectionHeader(ws, "  📋  STATUS BREAKDOWN", NUM_COLS);
  {
    const hdr = ws.addRow(["Status", "จำนวน Issues", "% ของช่วง", "% ของทั้งหมด", ""]);
    styleTableHeader(hdr, NUM_COLS);
  }

  let alt = false;
  for (const status of STATUS_ORDER) {
    const count = statusCounts.find((s) => s.status === status)?._count ?? 0;
    if (count === 0) continue;
    const { dark, light } = STATUS_PALETTE[status];
    const row = ws.addRow([STATUS_LABELS[status], count, pct(count, totalInPeriod), pct(count, totalAllCount), ""]);
    row.height = 22;

    setFill(row.getCell(1), light);
    row.getCell(1).font = { bold: true, size: 10, color: { argb: dark }, name: "Calibri" };
    row.getCell(1).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    setBorder(row.getCell(1));

    const bg = alt ? C.gray50 : C.white;
    for (const col of [2, 3, 4, 5]) {
      setFill(row.getCell(col), bg);
      row.getCell(col).font = { size: 10, name: "Calibri", color: { argb: C.gray700 } };
      row.getCell(col).alignment = { horizontal: "center", vertical: "middle" };
      setBorder(row.getCell(col));
    }
    alt = !alt;
  }

  // Status total row
  {
    const row = ws.addRow(["รวมทั้งหมด (ในช่วง)", totalInPeriod, "100%", pct(totalInPeriod, totalAllCount), ""]);
    row.height = 22;
    for (let col = 1; col <= NUM_COLS; col++) {
      setFill(row.getCell(col), C.gray100);
      row.getCell(col).font = { bold: true, size: 10, name: "Calibri", color: { argb: C.gray700 } };
      row.getCell(col).alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle", indent: col === 1 ? 1 : 0 };
      setBorder(row.getCell(col), "medium", C.gray300);
    }
  }

  addSpacer(ws);

  // ── PRIORITY BREAKDOWN ───────────────────────────────────────────────────────
  addSectionHeader(ws, "  🎯  PRIORITY BREAKDOWN", NUM_COLS);
  {
    const hdr = ws.addRow(["Priority", "จำนวน Issues", "% ของช่วง", "% ของทั้งหมด", ""]);
    styleTableHeader(hdr, NUM_COLS);
  }

  alt = false;
  for (const priority of PRIORITY_ORDER) {
    const count = priorityMap.get(priority) ?? 0;
    if (count === 0) continue;
    const { dark, light } = PRIORITY_PALETTE[priority];
    const row = ws.addRow([PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] ?? priority, count, pct(count, totalInPeriod), pct(count, totalAllCount), ""]);
    row.height = 22;

    setFill(row.getCell(1), light);
    row.getCell(1).font = { bold: true, size: 10, color: { argb: dark }, name: "Calibri" };
    row.getCell(1).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    setBorder(row.getCell(1));

    const bg = alt ? C.gray50 : C.white;
    for (const col of [2, 3, 4, 5]) {
      setFill(row.getCell(col), bg);
      row.getCell(col).font = { size: 10, name: "Calibri", color: { argb: C.gray700 } };
      row.getCell(col).alignment = { horizontal: "center", vertical: "middle" };
      setBorder(row.getCell(col));
    }
    alt = !alt;
  }

  // ── PROJECT OVERVIEW ─────────────────────────────────────────────────────────
  if (projectBreakdown.length > 1) {
    addSpacer(ws);
    addSectionHeader(ws, "  📁  PROJECT OVERVIEW", NUM_COLS);
    {
      const hdr = ws.addRow(["Project", "จำนวน Issues", "% ของช่วง", "", ""]);
      styleTableHeader(hdr, NUM_COLS);
    }

    alt = false;
    for (const proj of projectBreakdown) {
      const row = ws.addRow([proj.name, proj.count, pct(proj.count, totalInPeriod), "", ""]);
      row.height = 21;
      const bg = alt ? C.gray50 : C.white;
      for (let col = 1; col <= NUM_COLS; col++) {
        setFill(row.getCell(col), bg);
        row.getCell(col).font = { size: 10, name: "Calibri", color: { argb: C.gray700 } };
        row.getCell(col).alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle", indent: col === 1 ? 1 : 0 };
        setBorder(row.getCell(col));
      }
      alt = !alt;
    }
  }

  // ── ASSIGNEE WORKLOAD ────────────────────────────────────────────────────────
  if (assigneeBreakdown.length > 0) {
    addSpacer(ws);
    addSectionHeader(ws, "  👥  ASSIGNEE WORKLOAD (Top 15)", NUM_COLS);
    {
      const hdr = ws.addRow(["Assignee", "จำนวน Issues", "% ของช่วง", "", ""]);
      styleTableHeader(hdr, NUM_COLS);
    }

    alt = false;
    for (const a of assigneeBreakdown) {
      const row = ws.addRow([a.name, a.count, pct(a.count, totalInPeriod), "", ""]);
      row.height = 21;
      const bg = alt ? C.gray50 : C.white;
      for (let col = 1; col <= NUM_COLS; col++) {
        setFill(row.getCell(col), bg);
        row.getCell(col).font = { size: 10, name: "Calibri", color: { argb: C.gray700 } };
        row.getCell(col).alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle", indent: col === 1 ? 1 : 0 };
        setBorder(row.getCell(col));
      }
      alt = !alt;
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  addSpacer(ws, 16);
  {
    const footer = ws.addRow([`Generated by Issue Log Tracker  •  Export: ${exportedAt}`]);
    ws.mergeCells(footer.number, 1, footer.number, NUM_COLS);
    footer.height = 18;
    setFill(footer.getCell(1), C.navyDark);
    footer.getCell(1).font = { size: 9, color: { argb: C.gray400 }, italic: true, name: "Calibri" };
    footer.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  }

  // ══ Sheet 2: Issues Detail ════════════════════════════════════════════════════
  const detail = workbook.addWorksheet("Issues Detail", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const DETAIL_COLS = [
    { header: "#",          width: 5  },
    { header: "Issue ID",   width: 14 },
    { header: "Title",      width: 52 },
    { header: "Project",    width: 20 },
    { header: "Client",     width: 18 },
    { header: "Priority",   width: 12 },
    { header: "Status",     width: 24 },
    { header: "Assignee",   width: 18 },
    { header: "Logged By",  width: 18 },
    { header: "Created By", width: 18 },
    { header: "Created At", width: 18 },
  ];
  detail.columns = DETAIL_COLS.map(({ width }) => ({ width }));

  detail.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: DETAIL_COLS.length } };

  const detailHdr = detail.addRow(DETAIL_COLS.map((c) => c.header));
  detailHdr.height = 30;
  detailHdr.eachCell((c, col) => {
    setFill(c, C.navy);
    c.font = { bold: true, size: 10, color: { argb: C.white }, name: "Calibri" };
    c.alignment = { vertical: "middle", horizontal: col === 3 ? "left" : "center" };
    setBorder(c, "thin", C.navyMid);
  });

  issues.forEach((issue, idx) => {
    const status   = issue.status as IssueStatus;
    const { dark: sDark, light: sLight } = STATUS_PALETTE[status];
    const pPalette = PRIORITY_PALETTE[issue.priority];
    const rowBg    = idx % 2 === 0 ? C.white : C.gray50;

    const row = detail.addRow([
      idx + 1,
      generateIssueCode(issue.project.code, issue.issueNumber),
      issue.title,
      issue.project.name,
      issue.client?.name ?? "–",
      PRIORITY_LABELS[issue.priority],
      STATUS_LABELS[status],
      issue.assignee?.name ?? "–",
      issue.loggedBy?.name ?? issue.createdBy.name,
      issue.createdBy.name,
      format(new Date(issue.createdAt), "dd/MM/yyyy HH:mm"),
    ]);
    row.height = 20;

    row.eachCell((c, col) => {
      setFill(c, rowBg);
      c.font = { size: 10, name: "Calibri", color: { argb: C.gray700 } };
      c.alignment = { vertical: "middle", horizontal: col === 3 ? "left" : "center" };
      setBorder(c);
    });

    // Priority cell (col 6)
    if (pPalette) {
      setFill(row.getCell(6), pPalette.light);
      row.getCell(6).font = { bold: true, size: 10, color: { argb: pPalette.dark }, name: "Calibri" };
    }

    // Status cell (col 7)
    setFill(row.getCell(7), sLight);
    row.getCell(7).font = { bold: true, size: 10, color: { argb: sDark }, name: "Calibri" };
  });

  // ── Response ──────────────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = format(new Date(), "yyyyMMdd_HHmm");

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="issue-report_${dateStr}.xlsx"`,
    },
  });
}
