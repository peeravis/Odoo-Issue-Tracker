"use client";

import { useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitBugReport } from "@/app/actions/report-bug";
import { BUG_REPORT_PRIORITIES, BUG_PRIORITY_LABELS } from "@/lib/report-bug";
import { Paperclip, X, Loader2, Send } from "lucide-react";

export function ReportBugForm({ defaultPriority = "medium" }: { defaultPriority?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    files.forEach((f) => data.append("attachments", f));
    startTransition(async () => {
      try {
        await submitBugReport(data);
      } catch (err: unknown) {
        if (err instanceof Error && !err.message.includes("NEXT_REDIRECT")) {
          setError(err.message);
        }
      }
    });
  };

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...Array.from(newFiles).filter((f) => !existing.has(f.name + f.size))];
    });
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <Input id="title" name="title" label="Title" required placeholder="สรุปปัญหาที่พบ" />

      <Textarea
        id="description"
        name="description"
        label="Description"
        rows={5}
        placeholder="อธิบายปัญหา, steps to reproduce, expected vs actual behaviour..."
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
        <select
          name="priority"
          defaultValue={defaultPriority}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          {BUG_REPORT_PRIORITIES.map((p) => (
            <option key={p} value={p}>{BUG_PRIORITY_LABELS[p]}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Attachments</label>
        <div
          className="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 px-6 py-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        >
          <Paperclip className="h-5 w-5 text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">คลิกหรือลากไฟล์มาวางที่นี่</p>
          <p className="text-xs text-gray-400">PDF, รูปภาพ, Word, Excel — ไม่เกิน 5 MB/ไฟล์</p>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <ul className="space-y-1.5">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm">
                <Paperclip className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{f.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending} className="gap-2">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {pending ? "กำลังส่ง..." : "ส่ง Report"}
        </Button>
      </div>
    </form>
  );
}
