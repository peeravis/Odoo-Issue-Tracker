import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync } from "fs";
import path from "path";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  wait_for_user_check: "Wait For User Check",
  reopened: "Reopened",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_COLOR: Record<string, string> = {
  open: "#3b82f6",
  in_progress: "#f59e0b",
  wait_for_user_check: "#8b5cf6",
  reopened: "#ef4444",
  resolved: "#10b981",
  closed: "#6b7280",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const PRIORITY_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

function formatDate(d: Date | null): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(d);
}

function badge(label: string, color: string) {
  return `<span style="background:${color}20;color:${color};border:1px solid ${color}40;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;white-space:nowrap">${label}</span>`;
}

async function main() {
  const openStatuses = ["open", "in_progress", "wait_for_user_check", "reopened"] as const;

  const issues = await prisma.issue.findMany({
    where: {
      status: { in: [...openStatuses] as any[] },
      project: { name: { contains: "upgrade", mode: "insensitive" } },
    },
    include: {
      project: { select: { id: true, name: true, code: true } },
      assignee: { select: { name: true } },
      client: { select: { name: true } },
    },
    orderBy: [{ project: { name: "asc" } }, { priority: "asc" }, { createdAt: "asc" }],
  });

  // Group by project
  const byProject = new Map<string, { name: string; code: string; issues: typeof issues }>();
  for (const issue of issues) {
    const pid = issue.project.id;
    if (!byProject.has(pid)) {
      byProject.set(pid, { name: issue.project.name, code: issue.project.code, issues: [] });
    }
    byProject.get(pid)!.issues.push(issue);
  }

  const generated = new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeStyle: "short" }).format(new Date());

  let projectSections = "";
  for (const [, proj] of byProject) {
    const rows = proj.issues
      .map(
        (i) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;white-space:nowrap;color:#64748b;font-size:12px">${proj.code}-${String(i.issueNumber).padStart(3, "0")}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;max-width:360px">${i.title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${badge(STATUS_LABEL[i.status] ?? i.status, STATUS_COLOR[i.status] ?? "#64748b")}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${badge(PRIORITY_LABEL[i.priority] ?? i.priority, PRIORITY_COLOR[i.priority] ?? "#64748b")}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b">${i.assignee?.name ?? "-"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b">${i.module ?? "-"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b;white-space:nowrap">${formatDate(i.dueDate)}</td>
        </tr>`
      )
      .join("");

    const statusCounts = openStatuses
      .map((s) => {
        const count = proj.issues.filter((i) => i.status === s).length;
        return count > 0 ? `<span style="font-size:12px;color:#64748b">${STATUS_LABEL[s]}: <strong>${count}</strong></span>` : "";
      })
      .filter(Boolean)
      .join(" &nbsp;·&nbsp; ");

    projectSections += `
    <div style="margin-bottom:40px">
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:12px">
        <h2 style="margin:0;font-size:16px;font-weight:700;color:#1e293b">${proj.name}</h2>
        <span style="font-size:12px;color:#94a3b8;font-weight:500">${proj.code}</span>
        <span style="margin-left:auto;font-size:12px;color:#64748b"><strong>${proj.issues.length}</strong> issues</span>
      </div>
      <div style="margin-bottom:10px;display:flex;gap:12px;flex-wrap:wrap">${statusCounts}</div>
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#64748b;border-bottom:2px solid #e2e8f0;white-space:nowrap">#</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#64748b;border-bottom:2px solid #e2e8f0">Title</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:600;color:#64748b;border-bottom:2px solid #e2e8f0">Status</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:600;color:#64748b;border-bottom:2px solid #e2e8f0">Priority</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#64748b;border-bottom:2px solid #e2e8f0">Assignee</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#64748b;border-bottom:2px solid #e2e8f0">Module</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#64748b;border-bottom:2px solid #e2e8f0">Due Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  const totalByStatus = openStatuses
    .map((s) => {
      const count = issues.filter((i) => i.status === s).length;
      return `<div style="text-align:center;padding:16px 24px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <div style="font-size:28px;font-weight:700;color:${STATUS_COLOR[s]}">${count}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px">${STATUS_LABEL[s]}</div>
      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Issue Report — Odoo Upgrade Projects</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; color: #1e293b; }
    @media print { body { background: #fff; } }
  </style>
</head>
<body>
  <div style="max-width:1100px;margin:0 auto;padding:32px 24px">
    <div style="margin-bottom:32px">
      <h1 style="margin:0 0 4px;font-size:24px;font-weight:800;color:#0f172a">Issue Report — Odoo Upgrade Projects</h1>
      <p style="margin:0;font-size:13px;color:#94a3b8">Generated: ${generated} &nbsp;·&nbsp; Open issues only (ไม่รวม resolved/closed)</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:40px">
      ${totalByStatus}
    </div>

    ${projectSections || '<p style="color:#94a3b8">ไม่พบ issue ที่ตรงเงื่อนไข</p>'}
  </div>
</body>
</html>`;

  const outPath = path.join(process.cwd(), "issue-report.html");
  writeFileSync(outPath, html, "utf-8");
  console.log(`✓ Generated: ${outPath} (${issues.length} issues, ${byProject.size} projects)`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
