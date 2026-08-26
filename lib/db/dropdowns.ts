import { prisma } from "@/lib/prisma";

/**
 * Returns project-specific dropdown options, falling back to global options
 * if no project-specific ones exist.
 */
export async function getDropdowns(type: string, projectId: string | null) {
  if (projectId) {
    const projectSpecific = await prisma.dropdownMaster.findMany({
      where: { type, projectId },
      orderBy: { sortOrder: "asc" },
    });
    if (projectSpecific.length > 0) return projectSpecific;
  }
  return prisma.dropdownMaster.findMany({
    where: { type, projectId: null },
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * Fetches users eligible to be assigned to issues (vendor or aspd extra roles).
 * Vendors are listed before ASPD; users are alphabetized within each group.
 * A user with both roles is treated as ASPD (matches the label logic in the UI).
 */
const ASSIGNEE_ORDER = ["wattana", "wisut", "suraphong", "suapawadee", "peerapat"];

function assigneePriority(name: string) {
  const lower = name.toLowerCase();
  const idx = ASSIGNEE_ORDER.findIndex((n) => lower.includes(n));
  return idx === -1 ? ASSIGNEE_ORDER.length : idx;
}

export async function getAssigneeUsers() {
  const users = await prisma.user.findMany({
    where: { isActive: true, extraRoles: { hasSome: ["vendor", "aspd"] } },
    select: { id: true, name: true, extraRoles: true },
    orderBy: { name: "asc" },
  });
  return users.sort((a, b) => {
    const pa = assigneePriority(a.name);
    const pb = assigneePriority(b.name);
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });
}
