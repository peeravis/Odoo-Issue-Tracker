import { cache } from "react";
import { prisma } from "./prisma";

export type RolePermissions = {
  canAccessDashboard: boolean;
  canViewAllProjects: boolean;
  canManageProjects: boolean;
  canCreateIssues: boolean;
  canEditIssues: boolean;
  canExportIssues: boolean;
  canManageMasterData: boolean;
  canManageUsers: boolean;
  canAccessConfig: boolean;
};

export const PERM_KEYS: (keyof RolePermissions)[] = [
  "canAccessDashboard",
  "canViewAllProjects",
  "canManageProjects",
  "canCreateIssues",
  "canEditIssues",
  "canExportIssues",
  "canManageMasterData",
  "canManageUsers",
  "canAccessConfig",
];

export const PERM_LABELS: Record<keyof RolePermissions, string> = {
  canAccessDashboard: "เข้าถึง Dashboard",
  canViewAllProjects: "ดู Projects ทั้งหมด",
  canManageProjects: "สร้าง/แก้ไข Project",
  canCreateIssues: "สร้าง Issue",
  canEditIssues: "แก้ไข Issue",
  canExportIssues: "Export Issues",
  canManageMasterData: "จัดการ Master Data",
  canManageUsers: "จัดการ Users",
  canAccessConfig: "Config Settings",
};

export const BUILT_IN_PERMISSIONS: Record<string, RolePermissions> = {
  admin: { canAccessDashboard: true, canViewAllProjects: true, canManageProjects: true, canCreateIssues: true, canEditIssues: true, canExportIssues: true, canManageMasterData: true, canManageUsers: true, canAccessConfig: true },
  pm: { canAccessDashboard: false, canViewAllProjects: true, canManageProjects: true, canCreateIssues: true, canEditIssues: true, canExportIssues: true, canManageMasterData: true, canManageUsers: false, canAccessConfig: false },
  member: { canAccessDashboard: false, canViewAllProjects: false, canManageProjects: false, canCreateIssues: true, canEditIssues: true, canExportIssues: true, canManageMasterData: false, canManageUsers: false, canAccessConfig: false },
  rnao: { canAccessDashboard: false, canViewAllProjects: false, canManageProjects: false, canCreateIssues: false, canEditIssues: false, canExportIssues: true, canManageMasterData: false, canManageUsers: false, canAccessConfig: false },
  co: { canAccessDashboard: false, canViewAllProjects: false, canManageProjects: false, canCreateIssues: false, canEditIssues: false, canExportIssues: true, canManageMasterData: false, canManageUsers: false, canAccessConfig: false },
  gl: { canAccessDashboard: false, canViewAllProjects: false, canManageProjects: false, canCreateIssues: false, canEditIssues: false, canExportIssues: true, canManageMasterData: false, canManageUsers: false, canAccessConfig: false },
};

const EMPTY: RolePermissions = {
  canAccessDashboard: false,
  canViewAllProjects: false,
  canManageProjects: false,
  canCreateIssues: false,
  canEditIssues: false,
  canExportIssues: false,
  canManageMasterData: false,
  canManageUsers: false,
  canAccessConfig: false,
};

// Per-request cache (React cache)
const fetchAllRolePermissions = cache(async (): Promise<Record<string, RolePermissions>> => {
  const result = { ...BUILT_IN_PERMISSIONS };
  try {
    const rows = await prisma.roleDefinition.findMany({ orderBy: { sortOrder: "asc" } });
    for (const row of rows) {
      result[row.name] = row.permissions as RolePermissions;
    }
  } catch {
    // table not yet migrated — fall back to built-ins
  }
  return result;
});

export async function getPermissions(role: string): Promise<RolePermissions> {
  const all = await fetchAllRolePermissions();
  return all[role] ?? EMPTY;
}

export async function getAllRoles(): Promise<Array<{ name: string; label: string; isSystem: boolean; permissions: RolePermissions; sortOrder: number }>> {
  const builtIn = [
    { name: "admin", label: "Admin", isSystem: true, sortOrder: 0, permissions: BUILT_IN_PERMISSIONS.admin },
    { name: "pm", label: "Project Manager", isSystem: true, sortOrder: 1, permissions: BUILT_IN_PERMISSIONS.pm },
    { name: "member", label: "Member", isSystem: true, sortOrder: 2, permissions: BUILT_IN_PERMISSIONS.member },
    { name: "rnao", label: "RNAO", isSystem: true, sortOrder: 3, permissions: BUILT_IN_PERMISSIONS.rnao },
    { name: "co", label: "CO", isSystem: true, sortOrder: 4, permissions: BUILT_IN_PERMISSIONS.co },
    { name: "gl", label: "GL", isSystem: true, sortOrder: 5, permissions: BUILT_IN_PERMISSIONS.gl },
  ];
  try {
    const dbRoles = await prisma.roleDefinition.findMany({ orderBy: { sortOrder: "asc" } });
    // Merge: DB overrides built-ins, custom roles appended
    const result = [...builtIn];
    for (const dbRole of dbRoles) {
      const existing = result.find((r) => r.name === dbRole.name);
      if (existing) {
        existing.label = dbRole.label;
        existing.permissions = dbRole.permissions as RolePermissions;
        existing.isSystem = dbRole.isSystem;
      } else {
        result.push({
          name: dbRole.name,
          label: dbRole.label,
          isSystem: dbRole.isSystem,
          sortOrder: dbRole.sortOrder,
          permissions: dbRole.permissions as RolePermissions,
        });
      }
    }
    return result.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return builtIn;
  }
}
