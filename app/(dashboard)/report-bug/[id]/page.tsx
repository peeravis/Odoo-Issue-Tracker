import { requireSession } from "@/lib/session";
import { getPermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FadeUp } from "@/components/ui/motion";
import { StatusUpdateForm } from "@/components/report-bug/status-update-form";
import { ArrowLeft, Paperclip, User, Calendar } from "lucide-react";
import {
  BUG_PRIORITY_LABELS,
  BUG_PRIORITY_COLORS,
  BUG_STATUS_LABELS,
  BUG_STATUS_COLORS,
  type BugReportPriority,
  type BugReportStatusType,
} from "@/lib/report-bug";

export default async function ReportBugDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const perms = await getPermissions(session.role);
  if (!perms.canAccessReportBug) redirect("/projects");
  const isAdmin = session.role === "admin";

  const report = await prisma.bugReport.findUnique({
    where: { id },
    include: {
      submittedBy: { select: { name: true, email: true } },
      attachments: true,
    },
  });

  if (!report) notFound();
  if (!isAdmin && report.submittedById !== session.userId) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <FadeUp>
        <Link
          href="/report-bug"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </Link>
      </FadeUp>

      <FadeUp delay={0.05}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white leading-snug flex-1">
              {report.title}
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
              <Badge
                dot
                label={BUG_PRIORITY_LABELS[report.priority as BugReportPriority] ?? report.priority}
                className={BUG_PRIORITY_COLORS[report.priority as BugReportPriority] ?? ""}
              />
              <Badge
                dot
                label={BUG_STATUS_LABELS[report.status as BugReportStatusType] ?? report.status}
                className={BUG_STATUS_COLORS[report.status as BugReportStatusType] ?? ""}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {report.submittedBy.name}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(report.createdAt)}
            </span>
          </div>

          {report.description && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Description
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {report.description}
              </p>
            </div>
          )}

          {report.attachments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Attachments
              </p>
              <ul className="space-y-1.5">
                {report.attachments.map((a) => (
                  <li key={a.id}>
                    <a
                      href={a.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                      <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                      {a.fileName}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isAdmin && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <StatusUpdateForm reportId={report.id} currentStatus={report.status} />
            </div>
          )}
        </div>
      </FadeUp>
    </div>
  );
}
