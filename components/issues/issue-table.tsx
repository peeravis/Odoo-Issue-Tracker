"use client";

import { Fragment, useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PriorityBadge } from "./priority-badge";
import { StatusDropdown } from "./status-dropdown";
import { formatDate, generateIssueCode } from "@/lib/utils";
import { bulkUpdateStatus } from "@/app/actions/issues";
import type { IssuePriority, IssueStatus } from "@/lib/types";
import { ChevronDown } from "lucide-react";

type Issue = {
  id: string;
  issueNumber: number;
  title: string;
  priority: IssuePriority;
  status: IssueStatus;
  department: string | null;
  issueType: string | null;
  module: string | null;
  dateReported: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  project: { code: string; name: string };
  client: { name: string } | null;
  assignee: { name: string } | null;
  createdBy: { name: string };
};

interface IssueTableProps {
  issues: Issue[];
  groupBy: string;
  fieldDefs?: { fieldKey: string; label: string }[];
}

const GROUP_FIELD_LABELS: Record<string, string> = {
  "": "No Group",
  status: "Status",
  priority: "Priority",
  module: "Module",
  issueType: "Issue Type",
  department: "Department",
  "assignee.name": "Assignee",
  "client.name": "Client",
  "project.name": "Project",
};

function getGroupValue(issue: Issue, groupBy: string): string {
  switch (groupBy) {
    case "status": return issue.status || "None";
    case "priority": return issue.priority || "None";
    case "module": return issue.module || "None";
    case "issueType": return issue.issueType || "None";
    case "department": return issue.department || "None";
    case "assignee.name": return issue.assignee?.name || "Unassigned";
    case "client.name": return issue.client?.name || "No Client";
    case "project.name": return issue.project.name;
    default: return "All";
  }
}

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.22, delay: i * 0.03, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

export function IssueTable({ issues, groupBy, fieldDefs = [] }: IssueTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === issues.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(issues.map((i) => i.id)));
    }
  };

  const handleBulkStatus = (status: IssueStatus) => {
    startTransition(async () => {
      await bulkUpdateStatus(Array.from(selected), status);
      setSelected(new Set());
    });
  };

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const grouped: Map<string, Issue[]> = new Map();
  for (const issue of issues) {
    const key = groupBy ? getGroupValue(issue, groupBy) : "all";
    const arr = grouped.get(key) ?? [];
    arr.push(issue);
    grouped.set(key, arr);
  }

  let globalRowIndex = 0;

  return (
    <div>
      {/* Bulk actions */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-3"
          >
            <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                {selected.size} selected
              </span>
              <span className="text-indigo-200 dark:text-indigo-700">|</span>
              <span className="text-sm text-gray-600 dark:text-gray-300">Change status:</span>
              {(["open", "in_progress", "resolved", "closed"] as IssueStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleBulkStatus(s)}
                  disabled={pending}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-indigo-300 capitalize transition-colors font-medium"
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/80 dark:bg-gray-900/40">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.size === issues.length && issues.length > 0}
                  onChange={toggleAll}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 w-36 text-xs uppercase tracking-wide">ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Issue</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell text-xs uppercase tracking-wide">Client</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden xl:table-cell text-xs uppercase tracking-wide">Module</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Priority</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell text-xs uppercase tracking-wide">Assignee</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden xl:table-cell text-xs uppercase tracking-wide">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {Array.from(grouped.entries()).map(([group, groupIssues]) => {
              const isCollapsed = collapsedGroups.has(group);
              return (
                <Fragment key={group}>
                  {groupBy && (
                    <tr
                      className="bg-gray-50/80 dark:bg-gray-900/30 cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-900/50 transition-colors"
                      onClick={() => toggleGroup(group)}
                    >
                      <td colSpan={9} className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <motion.div
                            animate={{ rotate: isCollapsed ? -90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                          </motion.div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            {GROUP_FIELD_LABELS[groupBy] ?? groupBy}:
                          </span>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                            {group}
                          </span>
                          <span className="text-xs text-gray-400 bg-gray-200/60 dark:bg-gray-700/60 px-1.5 py-0.5 rounded-full">
                            {groupIssues.length}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  <AnimatePresence initial={false}>
                    {!isCollapsed &&
                      groupIssues.map((issue) => {
                        const rowIdx = globalRowIndex++;
                        return (
                          <motion.tr
                            key={issue.id}
                            custom={rowIdx}
                            variants={rowVariants}
                            initial="hidden"
                            animate="show"
                            exit={{ opacity: 0, x: -8, transition: { duration: 0.15 } }}
                            className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors duration-150"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selected.has(issue.id)}
                                onChange={() => toggleSelect(issue.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border-gray-300 dark:border-gray-600"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="font-mono text-xs text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-1.5 py-0.5 rounded">
                                {generateIssueCode(issue.project.code, issue.issueNumber)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/issues/${issue.id}`}
                                className="font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1"
                              >
                                {issue.title}
                              </Link>
                              {issue.issueType && (
                                <p className="text-xs text-gray-400 mt-0.5">{issue.issueType}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-gray-500 dark:text-gray-400 text-xs">
                              {issue.client?.name ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                            <td className="px-4 py-3 hidden xl:table-cell text-gray-500 dark:text-gray-400 text-xs">
                              {issue.module ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <PriorityBadge priority={issue.priority} />
                            </td>
                            <td className="px-4 py-3">
                              <StatusDropdown issueId={issue.id} status={issue.status} />
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-gray-500 dark:text-gray-400 text-xs">
                              {issue.assignee?.name ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                            <td className="px-4 py-3 hidden xl:table-cell text-xs tabular-nums">
                              {(() => {
                                const isOverdue =
                                  issue.dueDate &&
                                  new Date(issue.dueDate) < new Date() &&
                                  issue.status !== "resolved" &&
                                  issue.status !== "closed";
                                return (
                                  <span className={isOverdue ? "text-red-500 font-medium" : "text-gray-400"}>
                                    {formatDate(issue.dateReported ?? issue.createdAt)}
                                    {isOverdue && (
                                      <span className="ml-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-semibold">
                                        Overdue
                                      </span>
                                    )}
                                  </span>
                                );
                              })()}
                            </td>
                          </motion.tr>
                        );
                      })}
                  </AnimatePresence>
                </Fragment>
              );
            })}
            {issues.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center mb-1">
                      <svg className="h-6 w-6 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-400">No issues found</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
