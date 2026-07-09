import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Roles that have admin-level "see all projects" access
export const ADMIN_ROLES = ["admin", "pm"] as const;
// Roles that are restricted to their assigned projects (member-equivalent)
export const MEMBER_ROLES = ["member", "rnao", "co", "gl"] as const;

export function canViewAllProjects(role: string) {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

export function isMemberRole(role: string) {
  return (MEMBER_ROLES as readonly string[]).includes(role);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateIssueCode(projectCode: string, issueNumber: number): string {
  return `${projectCode}-${String(issueNumber).padStart(3, "0")}`;
}

export const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
} as const;

export const STATUS_COLORS = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  reopened: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
} as const;

export const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

export const STATUS_LABELS = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Cancelled",
  reopened: "Reopened",
} as const;
