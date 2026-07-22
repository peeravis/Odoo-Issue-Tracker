"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PriorityDropdown } from "./priority-dropdown";
import { StatusDropdown } from "./status-dropdown";
import { AssigneeDropdown } from "./assignee-dropdown";
import { DueDatePicker } from "./due-date-picker";
import { formatDate, generateIssueCode } from "@/lib/utils";
import type { IssuePriority, IssueStatus } from "@/lib/types";

export type IssueRowData = {
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
  assignee: { id: string; name: string } | null;
  createdBy: { name: string };
};

type User = { id: string; name: string };

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.22, delay: i * 0.03, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

interface IssueRowProps {
  issue: IssueRowData;
  rowIndex: number;
  selected: boolean;
  users: User[];
  onToggleSelect: (id: string) => void;
}

export function IssueRow({ issue, rowIndex, selected, users, onToggleSelect }: IssueRowProps) {
  const issueCode = generateIssueCode(issue.project.code, issue.issueNumber);

  return (
    <motion.tr
      key={issue.id}
      custom={rowIndex}
      variants={rowVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, x: -8, transition: { duration: 0.15 } }}
      className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors duration-150"
    >
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(issue.id)}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-gray-300 dark:border-gray-600"
        />
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-mono text-xs text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-1.5 py-0.5 rounded">
          {issueCode}
        </span>
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/issues/${issue.id}`}
          className="font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors break-words"
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
        <PriorityDropdown issueId={issue.id} priority={issue.priority} />
      </td>
      <td className="px-4 py-3">
        <StatusDropdown issueId={issue.id} status={issue.status} />
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-xs">
        <AssigneeDropdown
          issueId={issue.id}
          issueCode={issueCode}
          assigneeId={issue.assignee?.id ?? null}
          assigneeName={issue.assignee?.name ?? null}
          users={users}
        />
      </td>
      <td className="px-4 py-3 hidden xl:table-cell text-xs tabular-nums text-gray-400">
        {formatDate(issue.dateReported ?? issue.createdAt)}
      </td>
      <td className="px-4 py-3 hidden xl:table-cell text-xs">
        <DueDatePicker issueId={issue.id} dueDate={issue.dueDate} />
      </td>
    </motion.tr>
  );
}
