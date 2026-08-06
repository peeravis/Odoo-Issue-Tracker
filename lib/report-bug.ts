export const BUG_REPORT_PRIORITIES = ["high", "medium", "low"] as const;
export type BugReportPriority = (typeof BUG_REPORT_PRIORITIES)[number];

export const BUG_REPORT_STATUSES = ["open", "in_progress", "resolved", "dismissed"] as const;
export type BugReportStatusType = (typeof BUG_REPORT_STATUSES)[number];

export const BUG_PRIORITY_LABELS: Record<BugReportPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const BUG_STATUS_LABELS: Record<BugReportStatusType, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export const BUG_PRIORITY_COLORS: Record<BugReportPriority, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

export const BUG_STATUS_COLORS: Record<BugReportStatusType, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  dismissed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};
