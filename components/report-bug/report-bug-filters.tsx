"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useCallback } from "react";
import {
  BUG_REPORT_PRIORITIES,
  BUG_REPORT_STATUSES,
  BUG_PRIORITY_LABELS,
  BUG_STATUS_LABELS,
} from "@/lib/report-bug";

interface User {
  id: string;
  name: string;
}

interface ReportBugFiltersProps {
  isAdmin: boolean;
  users?: User[];
}

export function ReportBugFilters({ isAdmin, users = [] }: ReportBugFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      const q = params.toString();
      startTransition(() => router.push(`${pathname}${q ? `?${q}` : ""}`));
    },
    [router, pathname, searchParams]
  );

  const clearAll = () => startTransition(() => router.push(pathname));
  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex flex-col gap-1 min-w-[180px] flex-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
          <input
            type="text"
            defaultValue={searchParams.get("search") ?? ""}
            placeholder="ค้นหา..."
            onChange={(e) => update("search", e.target.value)}
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Submitted By (admin only) */}
        {isAdmin && users.length > 0 && (
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Submitted By</label>
            <select
              value={searchParams.get("submittedById") ?? ""}
              onChange={(e) => update("submittedById", e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Priority */}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Priority</label>
          <select
            value={searchParams.get("priority") ?? ""}
            onChange={(e) => update("priority", e.target.value)}
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All</option>
            {BUG_REPORT_PRIORITIES.map((p) => (
              <option key={p} value={p}>{BUG_PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1 min-w-[130px]">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
          <select
            value={searchParams.get("status") ?? ""}
            onChange={(e) => update("status", e.target.value)}
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All</option>
            {BUG_REPORT_STATUSES.map((s) => (
              <option key={s} value={s}>{BUG_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* From */}
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">From</label>
          <input
            type="date"
            value={searchParams.get("from") ?? ""}
            onChange={(e) => update("from", e.target.value)}
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* To */}
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">To</label>
          <input
            type="date"
            value={searchParams.get("to") ?? ""}
            onChange={(e) => update("to", e.target.value)}
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors px-2 py-2 self-end"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
