import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { StatsCard } from "@/components/dashboard/stats-card";
import { StatusBadge } from "@/components/issues/status-badge";
import { PriorityBadge } from "@/components/issues/priority-badge";
import { FadeUp } from "@/components/ui/motion";
import { AlertCircle, Clock, CheckCircle, XCircle, Bug, BarChart3, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatDate, generateIssueCode } from "@/lib/utils";
import type { IssueStatus } from "@/lib/types";
import { ProjectFilter } from "@/components/dashboard/project-filter";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { ReportExport } from "@/components/dashboard/report-export";
import { DailyReport } from "@/components/dashboard/daily-report";
import { StatusDonutChart } from "@/components/dashboard/status-donut-chart";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; from?: string; to?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const perms = await getPermissions(session.role);
  if (!perms.canAccessDashboard) redirect("/projects");

  const sp = await searchParams;

  const allProjects = await prisma.project.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  // Selected project or all
  const selectedProject = sp.projectId
    ? allProjects.find((p) => p.id === sp.projectId) ?? null
    : null;

  const projectFilter = selectedProject
    ? { projectId: selectedProject.id }
    : { projectId: { in: allProjects.map((p) => p.id) } };

  // Date range filter
  const fromStr = sp.from ?? "";
  const toStr = sp.to ?? "";
  const fromDate = fromStr ? (() => { const d = new Date(fromStr); d.setHours(0, 0, 0, 0); return d; })() : null;
  const toDate = toStr ? (() => { const d = new Date(toStr); d.setHours(23, 59, 59, 999); return d; })() : null;
  const hasDates = !!(fromDate || toDate);

  const dateRangeCond = hasDates
    ? { createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
    : {};

  // Combined filter: project + optional date range
  const projectDateFilter = { ...projectFilter, ...dateRangeCond };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Period for the "report" card: use selected range or today
  const reportStart = fromDate ?? todayStart;
  const reportEnd = toDate ?? new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  const pendingStatuses: IssueStatus[] = ["open", "in_progress", "wait_for_user_check", "reopened"];

  const [statusCounts, recentIssues, priorityStats, monthlyStats, overdueIssues, projectStats, assigneeStats,
    periodNewCount, periodByStatus, pendingTotal, pendingByStatus, periodResolvedCount, totalAllCount] =
    await Promise.all([
      // Status counts: respect date range
      prisma.issue.groupBy({ by: ["status"], where: projectDateFilter, _count: true }),
      // Recent issues: respect date range
      prisma.issue.findMany({
        where: projectDateFilter,
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { project: { select: { code: true, name: true } }, client: true, assignee: true },
      }),
      // Priority stats: respect date range
      prisma.issue.groupBy({
        by: ["priority"],
        where: { ...projectDateFilter, status: { not: "closed" } },
        _count: true,
      }),
      // Monthly trend: always 6-month window regardless of range
      prisma.issue.findMany({
        where: {
          ...projectFilter,
          createdAt: { gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) },
        },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      // Overdue: current state, not date-filtered
      prisma.issue.findMany({
        where: {
          ...projectFilter,
          dueDate: { lt: new Date() },
          status: { notIn: ["resolved", "closed"] },
        },
        orderBy: { dueDate: "asc" },
        take: 5,
        select: {
          id: true, issueNumber: true, title: true, dueDate: true, priority: true,
          project: { select: { code: true, name: true } },
          assignee: { select: { name: true } },
        },
      }),
      // Open issues by project: respect date range
      prisma.issue.groupBy({
        by: ["projectId"],
        where: { ...projectDateFilter, status: { notIn: ["resolved", "closed"] } },
        _count: true,
        orderBy: { _count: { projectId: "desc" } },
        take: 8,
      }),
      // Open issues by assignee: respect date range
      prisma.issue.groupBy({
        by: ["assigneeId"],
        where: { ...projectDateFilter, status: { notIn: ["resolved", "closed"] }, assigneeId: { not: null } },
        _count: true,
        orderBy: { _count: { assigneeId: "desc" } },
        take: 8,
      }),
      // Period report: issues opened in selected period (or today)
      prisma.issue.count({ where: { ...projectFilter, createdAt: { gte: reportStart, lte: reportEnd } } }),
      prisma.issue.groupBy({ by: ["status"], where: { ...projectFilter, createdAt: { gte: reportStart, lte: reportEnd } }, _count: true }),
      // Pending: always current state
      prisma.issue.count({ where: { ...projectFilter, status: { in: pendingStatuses } } }),
      prisma.issue.groupBy({ by: ["status"], where: { ...projectFilter, status: { in: pendingStatuses } }, _count: true }),
      // Resolved in period
      prisma.issue.count({ where: { ...projectFilter, resolvedAt: { gte: reportStart, lte: reportEnd } } }),
      // Total issues: scoped to date range if active, else all
      prisma.issue.count({ where: projectDateFilter }),
    ]);

  const getStatusCount = (s: string) => statusCounts.find((x) => x.status === s)?._count ?? 0;
  const openCount = getStatusCount("open");
  const inProgressCount = getStatusCount("in_progress");
  const waitForCheckCount = getStatusCount("wait_for_user_check");
  const resolvedCount = getStatusCount("resolved");
  const closedCount = getStatusCount("closed");
  const reopenedCount = getStatusCount("reopened");
  const totalIssues = statusCounts.reduce((sum, x) => sum + x._count, 0);

  // Build 6-month trend
  const now = new Date();
  const months: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("th-TH", { month: "short", year: "2-digit" });
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const count = monthlyStats.filter(
      (s) => s.createdAt >= d && s.createdAt < nextMonth
    ).length;
    months.push({ label, count });
  }
  const maxMonthly = Math.max(...months.map((m) => m.count), 1);

  // Resolve project names for chart
  const projectStatIds = projectStats.map((s) => s.projectId);
  const projectNames = await prisma.project.findMany({
    where: { id: { in: projectStatIds } },
    select: { id: true, name: true },
  });
  const projectNameMap = new Map(projectNames.map((p) => [p.id, p.name]));
  const projectChartData = projectStats
    .map((s) => ({ name: projectNameMap.get(s.projectId) ?? s.projectId, count: s._count, id: s.projectId }))
    .sort((a, b) => b.count - a.count);
  const maxProjectCount = Math.max(...projectChartData.map((p) => p.count), 1);

  // Resolve assignee names for chart
  const assigneeStatIds = assigneeStats.map((s) => s.assigneeId!).filter(Boolean);
  const assigneeNames = await prisma.user.findMany({
    where: { id: { in: assigneeStatIds } },
    select: { id: true, name: true },
  });
  const assigneeNameMap = new Map(assigneeNames.map((u) => [u.id, u.name]));
  const assigneeChartData = assigneeStats
    .map((s) => ({ name: assigneeNameMap.get(s.assigneeId!) ?? "Unknown", count: s._count, id: s.assigneeId! }))
    .sort((a, b) => b.count - a.count);
  const maxAssigneeCount = Math.max(...assigneeChartData.map((a) => a.count), 1);

  const issuesHref = selectedProject ? `/issues?projectId=${selectedProject.id}` : "/issues";

  // Date label for DailyReport header
  const dateLabel = hasDates
    ? [
        fromDate?.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }),
        toDate?.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }),
      ].filter(Boolean).join(" — ")
    : new Date().toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      <FadeUp>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {selectedProject ? selectedProject.name : "ภาพรวมทุก Project"}
              </p>
            </div>
            <ProjectFilter projects={allProjects} selectedId={sp.projectId} from={fromStr} to={toStr} />
          </div>
          <DateRangeFilter from={fromStr} to={toStr} projectId={sp.projectId} />
        </div>
      </FadeUp>

      {/* Period Report */}
      <FadeUp delay={0.04}>
        <DailyReport
          todayNewCount={periodNewCount}
          todayByStatus={periodByStatus}
          pendingTotal={pendingTotal}
          pendingByStatus={pendingByStatus}
          todayResolvedCount={periodResolvedCount}
          totalIssues={totalAllCount}
          projectId={sp.projectId}
          dateLabel={dateLabel}
          from={fromStr}
          to={toStr}
        />
      </FadeUp>

      {/* Status Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard label="Open" value={openCount} icon={<AlertCircle className="h-5 w-5 text-white" />} color="bg-blue-500" delay={0.05} />
        <StatsCard label="In Progress" value={inProgressCount} icon={<Clock className="h-5 w-5 text-white" />} color="bg-purple-500" delay={0.1} />
        <StatsCard label="Wait Check" value={waitForCheckCount} icon={<AlertTriangle className="h-5 w-5 text-white" />} color="bg-orange-500" delay={0.12} />
        <StatsCard label="Resolved" value={resolvedCount} icon={<CheckCircle className="h-5 w-5 text-white" />} color="bg-emerald-500" delay={0.15} />
        <StatsCard label="Cancelled" value={closedCount} icon={<XCircle className="h-5 w-5 text-white" />} color="bg-slate-500" delay={0.2} />
        <StatsCard label="Reopened" value={reopenedCount} icon={<Bug className="h-5 w-5 text-white" />} color="bg-rose-500" delay={0.25} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <FadeUp delay={0.1}>
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-6 shadow-sm h-full">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Status Distribution</h2>
            </div>
            {totalIssues > 0 ? (
              <StatusDonutChart
                total={totalIssues}
                segments={[
                  { label: "Open", count: openCount, color: "#3B82F6" },
                  { label: "In Progress", count: inProgressCount, color: "#A855F7" },
                  { label: "Wait for Check", count: waitForCheckCount, color: "#F97316" },
                  { label: "Resolved", count: resolvedCount, color: "#10B981" },
                  { label: "Cancelled", count: closedCount, color: "#94A3B8" },
                  { label: "Reopened", count: reopenedCount, color: "#F43F5E" },
                ]}
              />
            ) : (
              <p className="text-sm text-gray-400 py-4">ยังไม่มี issues</p>
            )}
          </div>
        </FadeUp>

        {/* Priority Breakdown */}
        <FadeUp delay={0.12}>
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-6 shadow-sm h-full">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Open Issues by Priority</h2>
            </div>
            <div className="space-y-3">
              {(["high", "medium", "low"] as const).map((p) => {
                const stat = priorityStats.find((s) => s.priority === p);
                const count = stat?._count ?? 0;
                const totalOpen = priorityStats.reduce((a, s) => a + s._count, 0) || 1;
                const colors: Record<string, string> = {
                  high: "bg-red-500",
                  medium: "bg-yellow-400",
                  low: "bg-gray-300 dark:bg-gray-600",
                };
                return (
                  <div key={p}>
                    <div className="flex items-center justify-between mb-1">
                      <PriorityBadge priority={p} />
                      <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colors[p]}`}
                        style={{ width: `${(count / totalOpen) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </FadeUp>
      </div>

      {/* Monthly Trend */}
      <FadeUp delay={0.14}>
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Issues Created (Last 6 Months)</h2>
          </div>
          <div className="flex items-end gap-3 h-32">
            {months.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{m.count || ""}</span>
                <div className="w-full flex items-end" style={{ height: "80px" }}>
                  <div
                    className="w-full bg-indigo-500/80 hover:bg-indigo-500 rounded-t-md transition-all duration-300"
                    style={{ height: `${Math.max((m.count / maxMonthly) * 80, m.count > 0 ? 4 : 0)}px` }}
                    title={`${m.label}: ${m.count} issues`}
                  />
                </div>
                <span className="text-xs text-gray-400 text-center leading-tight">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </FadeUp>

      {/* Issues by Project & by Assignee */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Project */}
        <FadeUp delay={0.15}>
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-6 shadow-sm h-full">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Open Issues by Project</h2>
            </div>
            {projectChartData.length > 0 ? (
              <div className="space-y-2.5">
                {projectChartData.map((p) => (
                  <Link key={p.id} href={`/issues?projectId=${p.id}`} className="block group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-[200px]">{p.name}</span>
                      <span className="text-xs font-semibold tabular-nums text-gray-900 dark:text-white ml-2 flex-shrink-0">{p.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500 group-hover:bg-indigo-600 transition-all duration-300"
                        style={{ width: `${(p.count / maxProjectCount) * 100}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4">ไม่มี open issues</p>
            )}
          </div>
        </FadeUp>

        {/* By Assignee */}
        <FadeUp delay={0.17}>
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-6 shadow-sm h-full">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Open Issues by Assignee</h2>
            </div>
            {assigneeChartData.length > 0 ? (
              <div className="space-y-2.5">
                {assigneeChartData.map((a) => (
                  <Link key={a.id} href={`/issues?assigneeId=${a.id}`} className="block group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-[200px]">{a.name}</span>
                      <span className="text-xs font-semibold tabular-nums text-gray-900 dark:text-white ml-2 flex-shrink-0">{a.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500 group-hover:bg-violet-600 transition-all duration-300"
                        style={{ width: `${(a.count / maxAssigneeCount) * 100}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4">ไม่มี open issues ที่ assign</p>
            )}
          </div>
        </FadeUp>
      </div>

      {/* Overdue Widget */}
      {overdueIssues.length > 0 && (
        <FadeUp delay={0.14}>
          <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200/80 dark:border-red-800/50 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-red-200/60 dark:border-red-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h2 className="font-semibold text-red-700 dark:text-red-400 text-sm">
                  Overdue Issues ({overdueIssues.length}{overdueIssues.length === 5 ? "+" : ""})
                </h2>
              </div>
              <Link
                href={`${issuesHref}${issuesHref.includes("?") ? "&" : "?"}duePreset=overdue`}
                className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
              >
                View all →
              </Link>
            </div>
            <div className="divide-y divide-red-100 dark:divide-red-800/30">
              {overdueIssues.map((issue) => {
                const daysOverdue = Math.floor((Date.now() - new Date(issue.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <Link
                    key={issue.id}
                    href={`/issues/${issue.id}`}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <span className="text-xs font-mono text-red-400 w-20 flex-shrink-0">
                      {generateIssueCode(issue.project.code, issue.issueNumber)}
                    </span>
                    <span className="flex-1 text-sm text-gray-900 dark:text-white truncate">{issue.title}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PriorityBadge priority={issue.priority} />
                      {issue.assignee && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{issue.assignee.name}</span>
                      )}
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {daysOverdue}d overdue
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </FadeUp>
      )}

      {/* Report Export */}
      <FadeUp delay={0.16}>
        <ReportExport projectId={sp.projectId} />
      </FadeUp>

      {/* Recent Issues */}
      <FadeUp delay={0.15}>
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              Recent Issues{selectedProject && <span className="text-gray-400 font-normal ml-1">— {selectedProject.name}</span>}
            </h2>
            <Link href={issuesHref} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition-colors">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {recentIssues.map((issue) => (
              <Link
                key={issue.id}
                href={`/issues/${issue.id}`}
                className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors"
              >
                <span className="text-xs font-mono text-gray-400 w-20 flex-shrink-0">
                  {generateIssueCode(issue.project.code, issue.issueNumber)}
                </span>
                <span className="flex-1 text-sm text-gray-900 dark:text-white truncate">
                  {issue.title}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PriorityBadge priority={issue.priority} />
                  <StatusBadge status={issue.status} />
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {formatDate(issue.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
            {recentIssues.length === 0 && (
              <div className="px-6 py-12 text-center text-sm text-gray-400">
                ยังไม่มี issues
              </div>
            )}
          </div>
        </div>
      </FadeUp>
    </div>
  );
}
