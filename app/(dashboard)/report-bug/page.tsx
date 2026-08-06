import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FadeUp } from "@/components/ui/motion";
import { Plus, Download, ChevronRight } from "lucide-react";
import { ReportBugFilters } from "@/components/report-bug/report-bug-filters";
import {
  BUG_PRIORITY_LABELS,
  BUG_PRIORITY_COLORS,
  BUG_STATUS_LABELS,
  BUG_STATUS_COLORS,
  type BugReportPriority,
  type BugReportStatusType,
} from "@/lib/report-bug";
import { getPermissions } from "@/lib/permissions";
import { redirect } from "next/navigation";
import type { Prisma } from "@/app/generated/prisma/client";

interface SearchParams {
  search?: string;
  priority?: string;
  status?: string;
  submittedById?: string;
  from?: string;
  to?: string;
}

export default async function ReportBugPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const perms = await getPermissions(session.role);
  if (!perms.canAccessReportBug) redirect("/projects");
  const isAdmin = session.role === "admin";
  const sp = await searchParams;

  const fromDate = sp.from ? new Date(sp.from) : undefined;
  const toDate = sp.to ? new Date(sp.to + "T23:59:59") : undefined;

  const where: Prisma.BugReportWhereInput = {
    ...(isAdmin ? {} : { submittedById: session.userId }),
    ...(isAdmin && sp.submittedById ? { submittedById: sp.submittedById } : {}),
    ...(sp.priority ? { priority: sp.priority } : {}),
    ...(sp.status ? { status: sp.status as BugReportStatusType } : {}),
    ...(sp.search ? { title: { contains: sp.search, mode: "insensitive" } } : {}),
    ...((fromDate || toDate) ? {
      createdAt: {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      },
    } : {}),
  };

  const [reports, allUsers] = await Promise.all([
    prisma.bugReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        submittedBy: { select: { name: true } },
        attachments: { select: { id: true } },
      },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: { bugReports: { some: {} } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <FadeUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Report Bug</h1>
            <p className="text-sm text-gray-400 mt-0.5">{reports.length} reports</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <a
                href="/api/bug-reports/export"
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </a>
            )}
            <Link href="/report-bug/new" className="btn-primary inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Report
            </Link>
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={0.05}>
        <ReportBugFilters isAdmin={isAdmin} users={allUsers} />
      </FadeUp>

      <FadeUp delay={0.1}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {reports.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-gray-400">{isAdmin ? "ยังไม่มี Report Bug" : "คุณยังไม่เคยแจ้ง Report Bug"}</p>
              <Link
                href="/report-bug/new"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                สร้าง Report ใหม่
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Title</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Submitted By</th>
                  )}
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Priority</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Attach</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/report-bug/${r.id}`}
                        className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1"
                      >
                        {r.title}
                      </Link>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {r.submittedBy.name}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Badge
                        dot
                        label={BUG_PRIORITY_LABELS[r.priority as BugReportPriority] ?? r.priority}
                        className={BUG_PRIORITY_COLORS[r.priority as BugReportPriority] ?? ""}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        dot
                        label={BUG_STATUS_LABELS[r.status as BugReportStatusType] ?? r.status}
                        className={BUG_STATUS_COLORS[r.status as BugReportStatusType] ?? ""}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {r.attachments.length > 0 ? r.attachments.length : "—"}
                    </td>
                    <td className="px-2 py-3">
                      <Link href={`/report-bug/${r.id}`}>
                        <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </FadeUp>
    </div>
  );
}
