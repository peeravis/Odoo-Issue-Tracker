import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FolderKanban, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FadeUp, StaggerList, StaggerItem } from "@/components/ui/motion";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const sp = await searchParams;
  const statusFilter = sp.status === "closed" ? "closed" : "active";

  const isAdmin = session.role === "admin" || session.role === "pm";

  const [activeCount, closedCount] = await Promise.all([
    isAdmin
      ? prisma.project.count({ where: { status: "active" } })
      : prisma.projectMember.count({ where: { userId: session.userId, project: { status: "active" } } }),
    isAdmin
      ? prisma.project.count({ where: { status: "closed" } })
      : prisma.projectMember.count({ where: { userId: session.userId, project: { status: "closed" } } }),
  ]);

  const [projects, allGroups] = await Promise.all([
    isAdmin
      ? prisma.project.findMany({
          where: { status: statusFilter },
          include: { _count: { select: { issues: true, members: true } }, group: true },
          orderBy: { createdAt: "desc" },
        })
      : prisma.projectMember
          .findMany({
            where: { userId: session.userId, project: { status: statusFilter } },
            include: {
              project: {
                include: { _count: { select: { issues: true, members: true } }, group: true },
              },
            },
            orderBy: { createdAt: "desc" },
          })
          .then((m) => m.map((x) => x.project)),
    prisma.projectGroup.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <FadeUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Projects</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {projects.length} โปรเจกต์
            </p>
          </div>
          {isAdmin && statusFilter === "active" && <CreateProjectDialog />}
        </div>
      </FadeUp>

      {/* Status tabs */}
      <FadeUp delay={0.03}>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
          <Link
            href="/projects"
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              statusFilter === "active"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Active
            {activeCount > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                statusFilter === "active"
                  ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500"
              }`}>
                {activeCount}
              </span>
            )}
          </Link>
          <Link
            href="/projects?status=closed"
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              statusFilter === "closed"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Closed
            {closedCount > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                statusFilter === "closed"
                  ? "bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500"
              }`}>
                {closedCount}
              </span>
            )}
          </Link>
        </div>
      </FadeUp>

      {projects.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {statusFilter === "closed" ? "ไม่มีโปรเจกต์ที่ปิดแล้ว" : "ยังไม่มีโปรเจกต์"}
        </div>
      ) : (() => {
        const grouped = new Map<string, { label: string; items: typeof projects }>();
        for (const g of allGroups) grouped.set(g.id, { label: g.name, items: [] });
        grouped.set("__none__", { label: "ไม่ระบุกลุ่ม", items: [] });
        for (const p of projects) {
          const key = p.groupId ?? "__none__";
          if (!grouped.has(key)) grouped.set(key, { label: "ไม่ระบุกลุ่ม", items: [] });
          grouped.get(key)!.items.push(p);
        }
        return Array.from(grouped.entries())
          .filter(([, v]) => v.items.length > 0)
          .map(([key, { label, items }]) => (
            <div key={key} className="space-y-3">
              {allGroups.length > 0 && (
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</h2>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs text-gray-400">{items.length}</span>
                </div>
              )}
              <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((project) => (
                  <StaggerItem key={project.id}>
                    <div className={`bg-white dark:bg-gray-800/80 rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-6 flex flex-col gap-3 h-full ${
                      project.status === "closed"
                        ? "border-gray-200/60 dark:border-gray-700/40 opacity-80"
                        : "border-gray-200/80 dark:border-gray-700/50"
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            project.status === "closed" ? "bg-gray-100 dark:bg-gray-700" : "bg-indigo-100 dark:bg-indigo-900/30"
                          }`}>
                            <FolderKanban className={`h-5 w-5 ${
                              project.status === "closed" ? "text-gray-400 dark:text-gray-500" : "text-indigo-600 dark:text-indigo-400"
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{project.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{project.code}</p>
                          </div>
                        </div>
                        <Badge
                          label={project.status}
                          className={project.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}
                        />
                      </div>
                      {project.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{project.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{project._count.issues} issues</span>
                        <span>{project._count.members} members</span>
                      </div>
                      <div className="flex gap-2 mt-auto pt-2">
                        <Link
                          href={`/issues?projectId=${project.id}`}
                          className="flex-1 text-center text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        >
                          View Issues
                        </Link>
                        {isAdmin && (
                          <Link
                            href={`/projects/${project.id}/settings`}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Settings className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerList>
            </div>
          ));
      })()}
    </div>
  );
}
