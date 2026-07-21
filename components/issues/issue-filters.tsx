"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, User, AlertTriangle, Clock, CalendarDays } from "lucide-react";
import { STATUS_LABELS } from "@/lib/utils";

interface Project { id: string; name: string }
interface UserItem { id: string; name: string; extraRoles?: string[] }
interface Client { id: string; name: string }

interface IssueFiltersProps {
  projects: Project[];
  users: UserItem[];
  clients: Client[];
  modules: string[];
  issueTypes: string[];
  departments: string[];
  sessionUserId: string;
  defaults: {
    search?: string;
    projectId?: string;
    clientId?: string;
    priority?: string;
    status?: string;
    assigneeId?: string;
    module?: string;
    issueType?: string;
    department?: string;
    from?: string;
    to?: string;
    groupBy?: string;
    duePreset?: string;
  };
}

const DUE_PRESETS = [
  { key: "overdue", label: "Overdue", icon: AlertTriangle, color: "text-red-500 border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800" },
  { key: "today", label: "Due Today", icon: Clock, color: "text-amber-500 border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800" },
  { key: "week", label: "Due This Week", icon: CalendarDays, color: "text-blue-500 border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800" },
];

export function IssueFilters({ projects, users, clients, modules, issueTypes, departments, sessionUserId, defaults }: IssueFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [search, setSearch] = useState(defaults.search ?? "");

  const buildUrl = useCallback((overrides: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    return `/issues?${params.toString()}`;
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl({ search: value }));
    }, 450);
  };

  const handleSelect = (name: string, value: string) => {
    router.push(buildUrl({ [name]: value }));
  };

  const handleDuePreset = (key: string) => {
    const active = defaults.duePreset === key;
    router.push(buildUrl({ duePreset: active ? "" : key }));
  };

  const isMyIssues = defaults.assigneeId === sessionUserId;
  const handleMyIssues = () => {
    router.push(buildUrl({ assigneeId: isMyIssues ? "" : sessionUserId }));
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-4 shadow-sm space-y-3">
      {/* Quick filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Quick:</span>
        <button
          onClick={handleMyIssues}
          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
            isMyIssues
              ? "bg-indigo-600 border-indigo-600 text-white"
              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 hover:text-indigo-600"
          }`}
        >
          <User className="h-3 w-3" />
          My Issues
        </button>
        {DUE_PRESETS.map(({ key, label, icon: Icon, color }) => {
          const active = defaults.duePreset === key;
          return (
            <button
              key={key}
              onClick={() => handleDuePreset(key)}
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                active ? color + " font-semibold" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="border-t border-gray-100 dark:border-gray-700/60 pt-3">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search..."
              className="input-base w-full"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Project</label>
            <select
              defaultValue={defaults.projectId ?? ""}
              onChange={(e) => handleSelect("projectId", e.target.value)}
              className="input-base w-full"
            >
              <option value="">All Projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Client</label>
            <select
              defaultValue={defaults.clientId ?? ""}
              onChange={(e) => handleSelect("clientId", e.target.value)}
              className="input-base w-full"
            >
              <option value="">All Clients</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Priority</label>
            <select
              defaultValue={defaults.priority ?? ""}
              onChange={(e) => handleSelect("priority", e.target.value)}
              className="input-base w-full"
            >
              <option value="">All</option>
              {["high", "medium", "low"].map((p) => (
                <option key={p} value={p} className="capitalize">{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              defaultValue={defaults.status ?? ""}
              onChange={(e) => handleSelect("status", e.target.value)}
              className="input-base w-full"
            >
              <option value="">All</option>
              {(["open", "in_progress", "wait_for_user_check", "resolved", "closed", "reopened"] as const).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Assignee</label>
            <select
              defaultValue={defaults.assigneeId ?? ""}
              onChange={(e) => handleSelect("assigneeId", e.target.value)}
              className="input-base w-full"
            >
              <option value="">All</option>
              {users.map((u) => {
                const suffix = u.extraRoles?.includes("aspd") ? " (ASPD)" : u.extraRoles?.includes("vendor") ? " (Vendor)" : "";
                return <option key={u.id} value={u.id}>{u.name}{suffix}</option>;
              })}
            </select>
          </div>

          {modules.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Module</label>
              <select
                defaultValue={defaults.module ?? ""}
                onChange={(e) => handleSelect("module", e.target.value)}
                className="input-base w-full"
              >
                <option value="">All</option>
                {modules.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {issueTypes.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Issue Type</label>
              <select
                defaultValue={defaults.issueType ?? ""}
                onChange={(e) => handleSelect("issueType", e.target.value)}
                className="input-base w-full"
              >
                <option value="">All</option>
                {issueTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {departments.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Department</label>
              <select
                defaultValue={defaults.department ?? ""}
                onChange={(e) => handleSelect("department", e.target.value)}
                className="input-base w-full"
              >
                <option value="">All</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              defaultValue={defaults.from ?? ""}
              onChange={(e) => handleSelect("from", e.target.value)}
              className="input-base w-full"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              defaultValue={defaults.to ?? ""}
              onChange={(e) => handleSelect("to", e.target.value)}
              className="input-base w-full"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Group By
            </label>
            <select
              defaultValue={defaults.groupBy ?? ""}
              onChange={(e) => handleSelect("groupBy", e.target.value)}
              className="input-base w-full"
            >
              <option value="">No Group</option>
              <option value="status">Status</option>
              <option value="priority">Priority</option>
              <option value="module">Module</option>
              <option value="issueType">Issue Type</option>
              <option value="department">Department</option>
              <option value="assignee.name">Assignee</option>
              <option value="client.name">Client</option>
              <option value="project.name">Project</option>
            </select>
          </div>

          <div className="flex items-end gap-2 col-span-2">
            <a href="/issues" className="btn-secondary flex-1 text-center py-2">Clear All</a>
          </div>
        </div>
      </div>
    </div>
  );
}
