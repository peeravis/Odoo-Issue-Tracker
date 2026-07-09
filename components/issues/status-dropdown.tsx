"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { updateIssueStatus } from "@/app/actions/issues";
import { StatusBadge } from "./status-badge";
import type { IssueStatus } from "@/lib/types";

const STATUSES: IssueStatus[] = ["open", "in_progress", "resolved", "closed", "reopened"];

export function StatusDropdown({ issueId, status }: { issueId: string; status: IssueStatus }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(status);
  const [pending, startTransition] = useTransition();
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX });
    }
    setOpen((v) => !v);
  };

  const handleSelect = (s: IssueStatus) => {
    if (s === current) { setOpen(false); return; }
    setOpen(false);
    const prev = current;
    setCurrent(s);
    startTransition(async () => {
      try {
        await updateIssueStatus(issueId, s);
      } catch {
        setCurrent(prev);
      }
    });
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={pending}
        className={`transition-opacity ${pending ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
        title="Click to change status"
      >
        <StatusBadge status={current} />
      </button>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 9999 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200/80 dark:border-gray-700/60 p-1 min-w-[150px]"
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
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
