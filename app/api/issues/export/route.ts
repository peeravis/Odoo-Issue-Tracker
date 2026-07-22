import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { generateIssueCode, PRIORITY_LABELS, STATUS_LABELS, canViewAllProjects } from "@/lib/utils";
import { format } from "date-fns";
import type { IssuePriority, IssueStatus } from "@/lib/types";
import { buildIssueWhere } from "@/lib/db/issue-filters";

export async function GET(request: NextRequest) {
  // Auth check
  const session = await decrypt(request.cookies.get("session")?.value);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const projectId = sp.get("projectId");

  const userProjects = canViewAllProjects(session.role)
    ? await prisma.project.findMany({ select: { id: true } })
    : await prisma.projectMember
        .findMany({ where: { userId: session.userId }, select: { projectId: true } })
        .then((m) => m.map((x) => ({ id: x.projectId })));

  const projectIds = userProjects.map((p) => p.id);
  const where = buildIssueWhere(
    {
      projectId:  sp.get("projectId"),
      clientId:   sp.get("clientId"),
      department: sp.get("department"),
      issueType:  sp.get("issueType"),
      module:     sp.get("module"),
      priority:   sp.get("priority"),
      status:     sp.get("status"),
      assigneeId: sp.get("assigneeId"),
      search:     sp.get("search"),
      from:       sp.get("from"),
      to:         sp.get("to"),
    },
    projectIds
  );

  const issues = await prisma.issue.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      project: { include: { fieldDefs: { orderBy: { sortOrder: "asc" } } } },
      client: true,
      createdBy: true,
      loggedBy: true,
      assignee: true,
      modifiedBy: true,
    },
  });

  // Get field definitions for the project(s)
  const fieldDefsMap = new Map<string, { fieldKey: string; label: string }[]>();
  for (const issue of issues) {
    if (!fieldDefsMap.has(issue.projectId)) {
      fieldDefsMap.set(issue.projectId, issue.project.fieldDefs);
    }
  }

  // Collect all unique custom field keys
  const allCustomFields: { key: string; label: string }[] = [];
  const seenKeys = new Set<string>();
  for (const fields of fieldDefsMap.values()) {
    for (const f of fields) {
      if (!seenKeys.has(f.fieldKey)) {
        seenKeys.add(f.fieldKey);
        allCustomFields.push({ key: f.fieldKey, label: f.label });
      }
    }
  }

  const workbook = new ExcelJS.Workbook();
  const groupByField = sp.get("groupBy") ?? "";

  if (groupByField) {
    // Group into separate sheets
    const grouped = new Map<string, typeof issues>();
    for (const issue of issues) {
      let groupVal = "All";
      switch (groupByField) {
        case "status": groupVal = issue.status; break;
        case "priority": groupVal = issue.priority; break;
        case "module": groupVal = issue.module ?? "None"; break;
        case "issueType": groupVal = issue.issueType ?? "None"; break;
        case "department": groupVal = issue.department ?? "None"; break;
        case "assignee.name": groupVal = issue.assignee?.name ?? "Unassigned"; break;
        case "client.name": groupVal = issue.client?.name ?? "No Client"; break;
        case "project.name": groupVal = issue.project.name; break;
      }
      const arr = grouped.get(groupVal) ?? [];
      arr.push(issue);
      grouped.set(groupVal, arr);
    }

    for (const [groupName, groupIssues] of grouped.entries()) {
      const sheetName = groupName.substring(0, 31).replace(/[/\\?*[\]:]/g, "_");
      const sheet = workbook.addWorksheet(sheetName);
      addDataToSheet(sheet, groupIssues, allCustomFields);
    }
  } else {
    const sheet = workbook.addWorksheet("Issues");
    addDataToSheet(sheet, issues, allCustomFields);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  const projectCode = projectId
    ? issues[0]?.project.code ?? "ALL"
    : "ALL";
  const dateStr = format(new Date(), "yyyyMMdd");
  const filename = `issue-log_${projectCode}_${dateStr}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

type IssueRow = {
  issueNumber: number;
  title: string;
  priority: IssuePriority;
  status: IssueStatus;
  project: { code: string; name: string; fieldDefs: { fieldKey: string; label: string }[] };
  client: { name: string } | null;
  department: string | null;
  issueType: string | null;
  module: string | null;
  solution: string | null;
  createdBy: { name: string };
  loggedBy: { name: string } | null;
  assignee: { name: string } | null;
  modifiedBy: { name: string } | null;
  dateReported: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastModifiedAt: Date;
  customFields: unknown;
};

function addDataToSheet(
  sheet: ExcelJS.Worksheet,
  issues: IssueRow[],
  customFields: { key: string; label: string }[]
) {
  const standardHeaders = [
    "ID", "Issue", "Client", "หน่วยงาน", "Issue Type", "Module",
    "Priority", "Status", "Solution", "Created By", "Issue Logged By",
    "Assign To", "Modified By", "Date Reported", "Created", "Modified", "Last Modified",
  ];

  const headers = [...standardHeaders, ...customFields.map((f) => f.label)];
  const headerRow = sheet.addRow(headers);

  // Style header
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

  for (const issue of issues) {
    const cf = (issue.customFields as Record<string, unknown>) ?? {};
    const row = sheet.addRow([
      generateIssueCode(issue.project.code, issue.issueNumber),
      issue.title,
      issue.client?.name ?? "",
      issue.department ?? "",
      issue.issueType ?? "",
      issue.module ?? "",
      PRIORITY_LABELS[issue.priority as keyof typeof PRIORITY_LABELS] ?? issue.priority,
      STATUS_LABELS[issue.status as keyof typeof STATUS_LABELS] ?? issue.status,
      issue.solution ?? "",
      issue.createdBy.name,
      issue.loggedBy?.name ?? "",
      issue.assignee?.name ?? "",
      issue.modifiedBy?.name ?? "",
      issue.dateReported ? format(issue.dateReported, "yyyy-MM-dd") : "",
      format(issue.createdAt, "yyyy-MM-dd HH:mm"),
      format(issue.updatedAt, "yyyy-MM-dd"),
      format(issue.lastModifiedAt, "yyyy-MM-dd HH:mm"),
      ...customFields.map((f) => String(cf[f.key] ?? "")),
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
  }

  // Auto column width
  sheet.columns.forEach((col) => {
    if (!col) return;
    let maxLen = 10;
    col?.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 4, 50);
  });
}
