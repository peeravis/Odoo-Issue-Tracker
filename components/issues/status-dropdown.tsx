"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateIssueStatus } from "@/app/actions/issues";
import { StatusBadge } from "./status-badge";
import { STATUS_LABELS } from "@/lib/utils";
import type { IssueStatus } from "@/lib/types";

const STATUSES: IssueStatus[] = ["open", "in_progress", "resolved", "closed", "reopened"];

export function StatusDropdown({ issueId, status }: { issueId: string; status: IssueStatus }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(status);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (s: IssueStatus) => {
    if (s === current) { setOpen(false); return; }
    setOpen(false);
    const prev = current;
    setCurrent(s);
    startTransition(async () => {
      try {
        await updateIssueStatus(issueId, s);
      } catch {
        setCurrent(prev); // revert on error
      }
    });
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className={`transition-opacity ${pending ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
        title="Click to change status"
      >
        <StatusBadge status={current} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute z-30 top-full left-0 mt-1.5 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200/80 dark:border-gray-700/60 p-1 min-w-[150px]"
          >
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleSelect(s)}
                className={`w-full flex items-center px-2 py-1.5 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${s === current ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}
              >
                <StatusBadge status={s} />
                {s === current && <span className="ml-auto text-indigo-500 text-xs">✓</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
