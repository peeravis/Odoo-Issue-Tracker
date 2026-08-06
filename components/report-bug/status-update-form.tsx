"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { updateBugReportStatus } from "@/app/actions/report-bug";
import { BUG_REPORT_STATUSES, BUG_STATUS_LABELS } from "@/lib/report-bug";
import { Loader2, CheckCircle } from "lucide-react";

export function StatusUpdateForm({ reportId, currentStatus }: { reportId: string; currentStatus: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const status = new FormData(e.currentTarget).get("status") as string;
    startTransition(async () => {
      try {
        await updateBugReportStatus(reportId, status);
        setSuccess(true);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex flex-col gap-1 flex-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Update Status</label>
        <select
          name="status"
          defaultValue={currentStatus}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          {BUG_REPORT_STATUSES.map((s) => (
            <option key={s} value={s}>{BUG_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="secondary" size="md" disabled={pending} className="gap-2 flex-shrink-0">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
        {pending ? "Saving..." : "Save"}
      </Button>
      {error && <p className="text-xs text-red-600 self-center">{error}</p>}
      {success && <p className="text-xs text-green-600 self-center">Saved</p>}
    </form>
  );
}
