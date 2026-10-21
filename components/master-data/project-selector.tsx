"use client";
import { useRouter } from "next/navigation";

interface Props {
  projects: { id: string; name: string; code: string }[];
  selectedId?: string;
}

export function ProjectSelector({ projects, selectedId }: Props) {
  const router = useRouter();
  return (
    <select
      defaultValue={selectedId ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        if (val) router.push(`/master-data?projectId=${val}`);
        else router.push("/master-data");
      }}
      className="input-base text-sm min-w-[220px]"
    >
      <option value="">-- เลือก Project --</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.code})
        </option>
      ))}
    </select>
  );
}
