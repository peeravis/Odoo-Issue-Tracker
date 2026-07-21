"use client";

import { useRef, useState, useEffect } from "react";
import { UserPlus } from "lucide-react";

type User = { id: string; name: string; email: string };
type ProjectRole = { value: string; label: string };

export function MemberSearch({
  users,
  roles,
  addAction,
}: {
  users: User[];
  roles: readonly ProjectRole[];
  addAction: (formData: FormData) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users.slice(0, 8);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (user: User) => {
    setSelected(user);
    setSearch(user.name);
    setOpen(false);
  };

  const handleSubmit = async (formData: FormData) => {
    if (!selected) return;
    await addAction(formData);
    setSelected(null);
    setSearch("");
  };

  return (
    <form action={handleSubmit} className="flex gap-2 items-start">
      {/* Hidden userId that the server action reads */}
      <input type="hidden" name="userId" value={selected?.id ?? ""} />

      {/* Search input + dropdown */}
      <div ref={containerRef} className="relative flex-1">
        <input
          type="text"
          value={search}
          placeholder="ค้นหาชื่อหรืออีเมล..."
          autoComplete="off"
          className="input-base w-full"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelected(null);
            setOpen(true);
          }}
        />

        {open && filtered.length > 0 && (
          <ul className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-56 overflow-y-auto">
            {filtered.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(u)}
                  className="w-full flex flex-col px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</span>
                  <span className="text-xs text-gray-400">{u.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Role selector */}
      <select name="projectRole" className="input-base" defaultValue="developer">
        {roles.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      {/* Add button — disabled until user selected */}
      <button
        type="submit"
        disabled={!selected}
        className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <UserPlus className="h-4 w-4" />
        Add
      </button>
    </form>
  );
}
