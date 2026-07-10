"use client";

import { useState, useTransition } from "react";
import { updateIssueDueDate } from "@/app/actions/issues";
import { formatDate } from "@/lib/utils";
import { Calendar, X } from "lucide-react";

export function DueDatePicker({ issueId, dueDate }: { issueId: string; dueDate: Date | null }) {
  const [current, setCurrent] = useState<Date | null>(dueDate);
  const [pending, startTransition] = useTransition();

  const isOverdue =
    current &&
    new Date(current) < new Date();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const prev = current;
    const next = val ? new Date(val) : null;
    setCurrent(next);
    startTransition(async () => {
      try {
        await updateIssueDueDate(issueId, val || null);
      } catch {
        setCurrent(prev);
      }
    });
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = current;
    setCurrent(null);
    startTransition(async () => {
      try {
        await updateIssueDueDate(issueId, null);
      } catch {
        setCurrent(prev);
      }
    });
  };

  const dateValue = current ? new Date(current).toISOString().split("T")[0] : "";

  return (
    <div className={`relative group flex items-center gap-1 ${pending ? "opacity-60" : ""}`}>
      <label
        className={`flex items-center gap-1 cursor-pointer text-xs ${
          isOverdue
            ? "text-red-500 font-medium"
            : current
            ? "text-gray-500 dark:text-gray-400"
            : "text-gray-300 dark:text-gray-600 hover:text-gray-400"
        }`}
      >
        <Calendar className="h-3 w-3 flex-shrink-0" />
        <span>{current ? formatDate(current) : "Set due date"}</span>
        <input
          type="date"
          value={dateValue}
          onChange={handleChange}
          disabled={pending}
          className="absolute inset-0 opacity-0 cursor-pointer w-full"
        />
      </label>
      {current && (
        <button
          onClick={handleClear}
          disabled={pending}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
