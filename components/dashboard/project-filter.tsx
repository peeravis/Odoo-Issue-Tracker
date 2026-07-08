"use client";

import { useRouter } from "next/navigation";
import { FolderKanban } from "lucide-react";

type Project = { id: string; name: string; code: string };

export function ProjectFilter({
  projects,
  selectedId,
}: {
  projects: Project[];
  selectedId?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <select
          value={selectedId ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            router.push(val ? `/dashboard?projectId=${val}` : "/dashboard");
          }}
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
      {selectedId && (
        <button
          onClick={() => router.push("/dashboard")}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          ✕ รีเซ็ต
        </button>
      )}
    </div>
  );
}
