"use client";

import { useRouter } from "next/navigation";
import { FolderKanban } from "lucide-react";

type Project = { id: string; name: string; code: string };

export function ProjectFilter({
  projects,
  selectedId,
  from,
  to,
}: {
  projects: Project[];
  selectedId?: string;
  from?: string;
  to?: string;
}) {
  const router = useRouter();

  const push = (projectId: string) => {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/dashboard${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <div className="relative">
      <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <select
        value={selectedId ?? ""}
        onChange={(e) => push(e.target.value)}
        className="pl-9 pr-8 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 appearance-none cursor-pointer shadow-sm"
      >
        <option value="">ทุก Project</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            [{p.code}] {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
