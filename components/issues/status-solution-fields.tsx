"use client";

import { useState } from "react";
import { STATUS_LABELS } from "@/lib/utils";

const STATUS_OPTIONS = ["open", "in_progress", "wait_for_user_check", "resolved", "closed", "reopened"];

interface StatusSolutionFieldsProps {
  defaultStatus?: string;
  defaultSolution?: string;
}

export function StatusSolutionFields({ defaultStatus = "open", defaultSolution = "" }: StatusSolutionFieldsProps) {
  const [status, setStatus] = useState(defaultStatus);

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input-base w-full"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s as keyof typeof STATUS_LABELS] ?? s}</option>
          ))}
        </select>
      </div>

      {status === "resolved" && (
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Solution <span className="text-red-500">*</span>
          </label>
          <textarea
            name="solution"
            rows={4}
            required
            defaultValue={defaultSolution}
            className="input-base w-full"
            placeholder="วิธีแก้ไข / รายละเอียด"
          />
        </div>
      )}
    </>
  );
}
