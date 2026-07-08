"use client";

import { useRouter } from "next/navigation";

interface ProjectSelectorProps {
  projects: { id: string; name: string; code: string }[];
  selectedProjectId: string;
}

export function ProjectSelector({ projects, selectedProjectId }: ProjectSelectorProps) {
  const router = useRouter();

  return (
    <select
      name="projectId"
      defaultValue={selectedProjectId}
      required
      onChange={(e) => {
        const url = new URL(window.location.href);
        url.searchParams.set("projectId", e.target.value);
        router.push(url.pathname + url.search);
      }}
      className="input-base w-full"
    >
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.code})
        </option>
      ))}
    </select>
  );
}
