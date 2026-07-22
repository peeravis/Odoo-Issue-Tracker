"use client";

import { useRouter } from "next/navigation";
import { Calendar, X } from "lucide-react";

interface DateRangeFilterProps {
  from?: string;
  to?: string;
  projectId?: string;
}

export function DateRangeFilter({ from = "", to = "", projectId }: DateRangeFilterProps) {
  const router = useRouter();

  const push = (newFrom: string, newTo: string) => {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    if (newFrom) params.set("from", newFrom);
    if (newTo) params.set("to", newTo);
    router.push(`/dashboard${params.toString() ? `?${params}` : ""}`);
  };

  const hasRange = !!(from || to);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => push(e.target.value, to)}
        className="input-base py-1.5 text-sm w-36"
      />
      <span className="text-gray-400 text-sm select-none">—</span>
      <input
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => push(from, e.target.value)}
        className="input-base py-1.5 text-sm w-36"
      />
      {hasRange && (
        <button
          onClick={() => {
            const params = new URLSearchParams();
            if (projectId) params.set("projectId", projectId);
            router.push(`/dashboard${params.toString() ? `?${params}` : ""}`);
          }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="ล้างวันที่"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
