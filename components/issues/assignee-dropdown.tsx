"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { updateIssueAssignee } from "@/app/actions/issues";
import { UserCircle, X, AlertTriangle } from "lucide-react";

type User = { id: string; name: string; extraRoles?: string[] };
type Pending = { userId: string | null; name: string | null };

export function AssigneeDropdown({
  issueId,
  issueCode,
  assigneeId,
  assigneeName,
  users,
}: {
  issueId: string;
  issueCode: string;
  assigneeId: string | null;
  assigneeName: string | null;
  users: User[];
}) {
  const [open, setOpen] = useState(false);
  const [currentId, setCurrentId] = useState(assigneeId);
  const [currentName, setCurrentName] = useState(assigneeName);
  const [pending, startTransition] = useTransition();
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
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
    setSearch("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const requestSelect = (userId: string | null, name: string | null) => {
    setOpen(false);
    setSearch("");
    if (userId === currentId) return;
    setConfirm({ userId, name });
  };

  const confirmSelect = () => {
    if (!confirm) return;
    const { userId, name } = confirm;
    setConfirm(null);
    const prevId = currentId;
    const prevName = currentName;
    setCurrentId(userId);
    setCurrentName(name);
    startTransition(async () => {
      try {
        await updateIssueAssignee(issueId, userId);
      } catch {
        setCurrentId(prevId);
        setCurrentName(prevName);
      }
    });
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={pending}
        title="Click to change assignee"
        className={`flex items-center gap-1 text-xs transition-opacity ${
          pending ? "opacity-60 cursor-wait" : "cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
        } ${currentName ? "text-gray-600 dark:text-gray-300" : "text-gray-300 dark:text-gray-600"}`}
      >
        {currentName ? (
          <span>{currentName}</span>
        ) : (
          <span className="flex items-center gap-1"><UserCircle className="h-3.5 w-3.5" /> Assign</span>
        )}
      </button>

      {/* Search dropdown */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 9999 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200/80 dark:border-gray-700/60 w-52"
            >
              <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหา..."
                  className="w-full text-xs px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 outline-none focus:border-indigo-400"
                />
              </div>
              <div className="max-h-52 overflow-y-auto p-1">
                {currentId && (
                  <button
                    onClick={() => requestSelect(null, null)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <X className="h-3 w-3" /> Unassign
                  </button>
                )}
                {filtered.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => requestSelect(u.id, u.name)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      u.id === currentId ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    <span className="h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold flex-shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 truncate">
                      {u.name}
                      {u.extraRoles?.includes("aspd") && <span className="ml-1 text-indigo-400">(ASPD)</span>}
                      {!u.extraRoles?.includes("aspd") && u.extraRoles?.includes("vendor") && <span className="ml-1 text-amber-500">(Vendor)</span>}
                    </span>
                    {u.id === currentId && <span className="text-indigo-500">✓</span>}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">ไม่พบ</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Confirm dialog */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {confirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-80 p-6"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">เปลี่ยน Assignee</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Case {issueCode}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 mb-5">
                  ต้องการเปลี่ยนจาก{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{currentName ?? "ไม่มี"}</span>
                  {" "}เป็น{" "}
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">{confirm.name ?? "ไม่มี (Unassign)"}</span>
                  {" "}ใช่หรือไม่?
                </p>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setConfirm(null)}
                    className="btn-secondary text-sm"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmSelect}
                    className="btn-primary text-sm"
                  >
                    ยืนยัน
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
