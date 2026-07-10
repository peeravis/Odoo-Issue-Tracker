"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { updateIssuePriority } from "@/app/actions/issues";
import { PriorityBadge } from "./priority-badge";
import type { IssuePriority } from "@/lib/types";

const PRIORITIES: IssuePriority[] = ["high", "medium", "low"];

export function PriorityDropdown({ issueId, priority }: { issueId: string; priority: IssuePriority }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(priority);
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

  const handleSelect = (p: IssuePriority) => {
    setOpen(false);
    if (p === current) return;
    const prev = current;
    setCurrent(p);
    startTransition(async () => {
      try {
        await updateIssuePriority(issueId, p);
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
        title="Click to change priority"
      >
        <PriorityBadge priority={current} />
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
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200/80 dark:border-gray-700/60 p-1 min-w-[130px]"
            >
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSelect(p)}
                  className={`w-full flex items-center px-2 py-1.5 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${p === current ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}
                >
                  <PriorityBadge priority={p} />
                  {p === current && <span className="ml-auto text-indigo-500 text-xs">✓</span>}
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
