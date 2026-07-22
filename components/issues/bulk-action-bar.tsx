"use client";

import { motion } from "framer-motion";
import { STATUS_LABELS } from "@/lib/utils";
import type { IssueStatus } from "@/lib/types";

const BULK_STATUSES: IssueStatus[] = ["open", "in_progress", "wait_for_user_check", "resolved", "closed"];

interface BulkActionBarProps {
  count: number;
  pending: boolean;
  onStatusChange: (status: IssueStatus) => void;
}

export function BulkActionBar({ count, pending, onStatusChange }: BulkActionBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden mb-3"
    >
      <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
          {count} selected
        </span>
        <span className="text-indigo-200 dark:text-indigo-700">|</span>
        <span className="text-sm text-gray-600 dark:text-gray-300">Change status:</span>
        {BULK_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            disabled={pending}
            className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-indigo-300 transition-colors font-medium"
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
