"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { updateIssueStatus, resolveIssue } from "@/app/actions/issues";
import { StatusBadge } from "./status-badge";
import type { IssueStatus } from "@/lib/types";

const STATUSES: IssueStatus[] = ["open", "in_progress", "resolved", "closed", "reopened"];

export function StatusDropdown({ issueId, status }: { issueId: string; status: IssueStatus }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(status);
  const [pending, startTransition] = useTransition();
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [solutionModal, setSolutionModal] = useState(false);
  const [solution, setSolution] = useState("");
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
    setOpen(false);
    if (s === current) return;

    if (s === "resolved") {
      setSolution("");
      setSolutionModal(true);
      return;
    }

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

  const handleResolveConfirm = () => {
    if (!solution.trim()) return;
    setSolutionModal(false);
    const prev = current;
    setCurrent("resolved");
    startTransition(async () => {
      try {
        await resolveIssue(issueId, solution.trim());
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
        <>
          {/* Status dropdown */}
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
          </AnimatePresence>

          {/* Solution modal */}
          <AnimatePresence>
            {solutionModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4"
                onClick={(e) => { if (e.target === e.currentTarget) setSolutionModal(false); }}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">ระบุ Solution</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">กรุณากรอก Solution ก่อนเปลี่ยน Status เป็น Resolved</p>
                  <textarea
                    autoFocus
                    rows={4}
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    placeholder="รายละเอียด solution..."
                    className="input-base w-full mb-4 resize-none"
                  />
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setSolutionModal(false)}
                      className="btn-secondary px-4 py-2"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleResolveConfirm}
                      disabled={!solution.trim()}
                      className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Resolve Issue
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </>
  );
}
