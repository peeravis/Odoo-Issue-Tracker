import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getPermissions } from "@/lib/permissions";
import { FolderKanban, Settings, ArrowLeft, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FadeUp, StaggerList, StaggerItem } from "@/components/ui/motion";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { CreateGroupDialog } from "@/components/projects/create-group-dialog";
import type { ProjectStatus } from "@/app/generated/prisma/enums";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; groupId?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const sp = await searchParams;
  const statusFilter = sp.status === "closed" ? "closed" : "active";
  const selectedGroupId = sp.groupId ?? null;

  const perms = await getPermissions(session.role);
  const isAdmin = perms.canViewAllProjects;

  const allGroups = await prisma.projectGroup.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      projects: {
        where: {
          status: statusFilter as ProjectStatus,
          ...(!isAdmin ? { members: { some: { userId: session.userId } } } : {}),
        },
        select: { id: true, _count: { select: { issues: true } } },
      },
    },
  });

  const projectWhere = {
    status: statusFilter as ProjectStatus,
    ...(selectedGroupId === "__none__" ? { groupId: null } : selectedGroupId ? { groupId: selectedGroupId } : {}),
    ...(!isAdmin ? { members: { some: { userId: session.userId } } } : {}),
  };

  const projects = await prisma.project.findMany({
    where: projectWhere,
    include: { _count: { select: { issues: true, members: true } }, group: true },
    orderBy: { createdAt: "desc" },
  });

  const groupFilter = selectedGroupId === "__none__"
    ? { groupId: null }
    : selectedGroupId
      ? { groupId: selectedGroupId }
      : {};

  const [activeCount, closedCount] = await Promise.all([
    isAdmin
      ? prisma.project.count({ where: { status: "active", ...groupFilter } })
      : prisma.projectMember.count({ where: { userId: session.userId, project: { status: "active", ...groupFilter } } }),
    isAdmin
      ? prisma.project.count({ where: { status: "closed", ...groupFilter } })
      : prisma.projectMember.count({ where: { userId: session.userId, project: { status: "closed", ...groupFilter } } }),
  ]);

  const ungroupedCount = await prisma.project.count({
    where: { status: statusFilter, groupId: null, ...(!isAdmin ? { members: { some: { userId: session.userId } } } : {}) },
  });

  const selectedGroup = selectedGroupId && selectedGroupId !== "__none__"
    ? allGroups.find((g) => g.id === selectedGroupId)
    : null;

  const backHref = statusFilter === "closed" ? "/projects?status=closed" : "/projects";

  return (
    <div className="space-y-6">
      <FadeUp>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedGroupId && (
              <Link href={backHref} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {selectedGroupId === "__none__" ? "ไม่ระบุกลุ่ม" : selectedGroup ? selectedGroup.name : "Projects"}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {selectedGroupId ? `${projects.length} โปรเจกต์` : `${allGroups.length} กลุ่ม`}
              </p>
            </div>
          </div>
          {isAdmin && statusFilter === "active" && (
            selectedGroupId ? <CreateProjectDialog /> : <CreateGroupDialog />
          )}
        </div>
      </FadeUp>

      {/* Status tabs */}
      <FadeUp delay={0.03}>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
          <Link
            href={selectedGroupId ? `/projects?groupId=${selectedGroupId}` : "/projects"}
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
              }`}>{activeCount}</span>
            )}
          </Link>
          <Link
            href={selectedGroupId ? `/projects?groupId=${selectedGroupId}&status=closed` : "/projects?status=closed"}
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
              }`}>{closedCount}</span>
            )}
          </Link>
        </div>
      </FadeUp>

      {/* Group view (no group selected) */}
      {!selectedGroupId ? (
        <div className="space-y-8">
          {/* Group cards */}
          {allGroups.length > 0 && (
            <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allGroups.map((group) => {
                const projectCount = group.projects.length;
                const issueCount = group.projects.reduce((sum, p) => sum + p._count.issues, 0);
                return (
                  <StaggerItem key={group.id}>
                    <Link
                      href={`/projects?groupId=${group.id}${statusFilter === "closed" ? "&status=closed" : ""}`}
                      className="block bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-11 w-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                          <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-base">{group.name}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-400">
                            <span>{projectCount} projects</span>
                            <span>·</span>
                            <span>{issueCount} issues</span>
                          </div>
                        </div>
                        <span className="text-gray-300 dark:text-gray-600 text-lg">›</span>
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          )}

          {/* Ungrouped projects */}
          {ungroupedCount > 0 && (
            <div className="space-y-3">
              {allGroups.length > 0 && (
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">ไม่ระบุกลุ่ม</h2>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <Link
                    href={`/projects?groupId=__none__${statusFilter === "closed" ? "&status=closed" : ""}`}
                    className="text-xs text-indigo-500 hover:underline"
                  >
                    ดูทั้งหมด ({ungroupedCount})
                  </Link>
                </div>
              )}
              <ProjectGrid projects={projects.filter((p) => !p.groupId) as ProjectItem[]} isAdmin={isAdmin} />
            </div>
          )}

          {allGroups.length === 0 && projects.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              {statusFilter === "closed" ? "ไม่มีโปรเจกต์ที่ปิดแล้ว" : "ยังไม่มีโปรเจกต์"}
            </div>
          )}
        </div>
      ) : (
        /* Projects in selected group */
        projects.length === 0 ? (
          <div className="text-center py-12 text-gray-400">ไม่มีโปรเจกต์ในกลุ่มนี้</div>
        ) : (
          <ProjectGrid projects={projects as ProjectItem[]} isAdmin={isAdmin} />
        )
      )}
    </div>
  );
}

type ProjectItem = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  _count: { issues: number; members: number };
};

function ProjectGrid({ projects, isAdmin }: { projects: ProjectItem[]; isAdmin: boolean }) {
  return (
    <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
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
  );
}
