import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { IssueTable } from "@/components/issues/issue-table";
import { IssueFilters } from "@/components/issues/issue-filters";
import { FadeUp } from "@/components/ui/motion";
import { Plus, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { getPermissions } from "@/lib/permissions";
import { PAGE_SIZE } from "@/lib/constants";
import { buildIssueWhere } from "@/lib/db/issue-filters";
import { getAssigneeUsers } from "@/lib/db/dropdowns";

interface SearchParams {
  projectId?: string;
  clientId?: string;
  department?: string;
  issueType?: string;
  module?: string;
  priority?: string;
  status?: string;
  assigneeId?: string;
  search?: string;
  groupBy?: string;
  from?: string;
  to?: string;
  page?: string;
  duePreset?: string;
}

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session) return null;

  const perms = await getPermissions(session.role);
  const canViewAll = perms.canViewAllProjects;

  // Determine accessible project IDs
  const userProjects = canViewAll
    ? await prisma.project.findMany({ select: { id: true, name: true, code: true } })
    : await prisma.projectMember
        .findMany({ where: { userId: session.userId }, include: { project: { select: { id: true, name: true, code: true } } } })
        .then((m) => m.map((x) => x.project));

  const projectIds = userProjects.map((p) => p.id);
  const where = buildIssueWhere(sp, projectIds);
  const page = Math.max(1, parseInt(sp.page ?? "1"));

  const [totalCount, issues, allUsers, allClients, distinctModules, distinctIssueTypes, distinctDepartments] = await Promise.all([
    prisma.issue.count({ where }),
    prisma.issue.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true, issueNumber: true, title: true, priority: true, status: true,
        department: true, issueType: true, module: true, dateReported: true,
        dueDate: true, createdAt: true,
        project: { select: { code: true, name: true } },
        client: { select: { name: true } },
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
      },
    }),
    getAssigneeUsers(),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.issue.findMany({ where: { projectId: { in: projectIds }, module: { not: null } }, select: { module: true }, distinct: ["module"], orderBy: { module: "asc" } }),
    prisma.issue.findMany({ where: { projectId: { in: projectIds }, issueType: { not: null } }, select: { issueType: true }, distinct: ["issueType"], orderBy: { issueType: "asc" } }),
    prisma.issue.findMany({ where: { projectId: { in: projectIds }, department: { not: null } }, select: { department: true }, distinct: ["department"], orderBy: { department: "asc" } }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const groupBy = sp.groupBy ?? "";

  // Build export URL with current filters (exclude page)
  const exportParams = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => { if (v && k !== "page") exportParams.set(k, v); });

  // Build pagination URLs preserving all other params
  function pageUrl(p: number) {
    const params = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => { if (v && k !== "page") params.set(k, v); });
    if (p > 1) params.set("page", String(p));
    const q = params.toString();
    return `/issues${q ? `?${q}` : ""}`;
  }

  return (
    <div className="space-y-4">
      <FadeUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Issues</h1>
            <p className="text-sm text-gray-400 mt-0.5">{totalCount} issues</p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/api/issues/export?${exportParams.toString()}`}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </a>
            <Link href="/issues/new" className="btn-primary inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Issue
            </Link>
          </div>
        </div>
      </FadeUp>

      {/* Filters */}
      <FadeUp delay={0.05}>
        <IssueFilters
          projects={userProjects}
          users={allUsers}
          clients={allClients}
          modules={distinctModules.map((r) => r.module!)}
          issueTypes={distinctIssueTypes.map((r) => r.issueType!)}
          departments={distinctDepartments.map((r) => r.department!)}
          sessionUserId={session.userId}
          defaults={{
            search: sp.search,
            projectId: sp.projectId,
            clientId: sp.clientId,
            priority: sp.priority,
            status: sp.status,
            assigneeId: sp.assigneeId,
            module: sp.module,
            issueType: sp.issueType,
            department: sp.department,
            from: sp.from,
            to: sp.to,
            groupBy: sp.groupBy,
            duePreset: sp.duePreset,
          }}
        />
      </FadeUp>

      <FadeUp delay={0.1}>
        <IssueTable issues={issues} groupBy={groupBy} users={allUsers} />
      </FadeUp>

      {totalPages > 1 && (
        <FadeUp delay={0.15}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
            <p className="text-sm text-gray-400 order-2 sm:order-1">
              หน้า {page} จาก {totalPages}
              <span className="hidden sm:inline"> · แสดง {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} จาก {totalCount} รายการ</span>
            </p>
            <div className="flex items-center gap-1 order-1 sm:order-2">
              <Link
                href={pageUrl(page - 1)}
                className={`p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${page <= 1 ? "pointer-events-none opacity-30" : ""}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">…</span>
                  ) : (
                    <Link
                      key={p}
                      href={pageUrl(p as number)}
                      className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        p === page
                          ? "bg-indigo-600 text-white"
                          : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {p}
                    </Link>
                  )
                )}

              <Link
                href={pageUrl(page + 1)}
                className={`p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${page >= totalPages ? "pointer-events-none opacity-30" : ""}`}
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </FadeUp>
      )}
    </div>
  );
}
