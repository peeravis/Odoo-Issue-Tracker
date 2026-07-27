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
export async function getAssigneeUsers() {
  const users = await prisma.user.findMany({
    where: { isActive: true, extraRoles: { hasSome: ["vendor", "aspd"] } },
    select: { id: true, name: true, extraRoles: true },
    orderBy: { name: "asc" },
  });
  return users.sort((a, b) => {
    const aIsVendor = !a.extraRoles.includes("aspd");
    const bIsVendor = !b.extraRoles.includes("aspd");
    if (aIsVendor !== bIsVendor) return aIsVendor ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
