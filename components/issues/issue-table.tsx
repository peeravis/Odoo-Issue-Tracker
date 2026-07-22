"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { bulkUpdateStatus } from "@/app/actions/issues";
import { BulkActionBar } from "./bulk-action-bar";
import { IssueRow, type IssueRowData } from "./issue-row";
import type { IssueStatus } from "@/lib/types";

type User = { id: string; name: string };

interface IssueTableProps {
  issues: IssueRowData[];
  groupBy: string;
  fieldDefs?: { fieldKey: string; label: string }[];
  users?: User[];
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

function getGroupValue(issue: IssueRowData, groupBy: string): string {
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

export function IssueTable({ issues, groupBy, users = [] }: IssueTableProps) {
  const router = useRouter();
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
    setSelected(selected.size === issues.length ? new Set() : new Set(issues.map((i) => i.id)));
  };

  const handleBulkStatus = (status: IssueStatus) => {
    startTransition(async () => {
      await bulkUpdateStatus(Array.from(selected), status);
      setSelected(new Set());
      router.refresh();
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

  const grouped: Map<string, IssueRowData[]> = new Map();
  for (const issue of issues) {
    const key = groupBy ? getGroupValue(issue, groupBy) : "all";
    const arr = grouped.get(key) ?? [];
    arr.push(issue);
    grouped.set(key, arr);
  }

  let globalRowIndex = 0;

  return (
    <div>
      <AnimatePresence>
        {selected.size > 0 && (
          <BulkActionBar
            count={selected.size}
            pending={pending}
            onStatusChange={handleBulkStatus}
          />
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
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden xl:table-cell text-xs uppercase tracking-wide">Due Date</th>
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
                      <td colSpan={10} className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <motion.div animate={{ rotate: isCollapsed ? -90 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                          </motion.div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            {GROUP_FIELD_LABELS[groupBy] ?? groupBy}:
                          </span>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{group}</span>
                          <span className="text-xs text-gray-400 bg-gray-200/60 dark:bg-gray-700/60 px-1.5 py-0.5 rounded-full">
                            {groupIssues.length}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  <AnimatePresence initial={false}>
                    {!isCollapsed &&
                      groupIssues.map((issue) => (
                        <IssueRow
                          key={issue.id}
                          issue={issue}
                          rowIndex={globalRowIndex++}
                          selected={selected.has(issue.id)}
                          users={users}
                          onToggleSelect={toggleSelect}
                        />
                      ))}
                  </AnimatePresence>
                </Fragment>
              );
            })}
            {issues.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-16 text-center">
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
