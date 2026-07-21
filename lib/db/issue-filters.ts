import type { IssuePriority, IssueStatus } from "@/lib/types";

export interface IssueFilterParams {
  projectId?: string | null;
  clientId?: string | null;
  department?: string | null;
  issueType?: string | null;
  module?: string | null;
  priority?: string | null;
  status?: string | null;
  assigneeId?: string | null;
  search?: string | null;
  from?: string | null;
  to?: string | null;
  duePreset?: string | null;
}

/**
 * Builds a Prisma `where` clause for issue queries, scoped to the given project IDs.
 * Used by both the issues list page and the export API to guarantee identical filtering.
 */
export function buildIssueWhere(
  filters: IssueFilterParams,
  accessibleProjectIds: string[]
): Record<string, unknown> {
  const where: Record<string, unknown> = {
    projectId:
      filters.projectId && accessibleProjectIds.includes(filters.projectId)
        ? filters.projectId
        : { in: accessibleProjectIds },
  };

  if (filters.clientId)   where.clientId   = filters.clientId;
  if (filters.department) where.department  = filters.department;
  if (filters.issueType)  where.issueType   = filters.issueType;
  if (filters.module)     where.module      = filters.module;
  if (filters.priority)   where.priority    = filters.priority as IssuePriority;
  if (filters.status)     where.status      = filters.status as IssueStatus;
  if (filters.assigneeId) where.assigneeId  = filters.assigneeId;

  if (filters.search) {
    where.OR = [
      { title:    { contains: filters.search, mode: "insensitive" } },
      { solution: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to   ? { lte: new Date(`${filters.to}T23:59:59`) } : {}),
    };
  }

  if (filters.duePreset === "overdue") {
    where.dueDate = { lt: new Date() };
    if (!filters.status) where.status = { notIn: ["resolved", "closed"] };
  } else if (filters.duePreset === "today") {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    where.dueDate = { gte: start, lte: end };
  } else if (filters.duePreset === "week") {
    where.dueDate = { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), not: null };
    if (!filters.status) where.status = { notIn: ["resolved", "closed"] };
  }

  return where;
}
