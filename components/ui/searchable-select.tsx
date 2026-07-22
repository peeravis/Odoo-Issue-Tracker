"use client";

import { useRef, useState, useEffect, useId } from "react";
import { ChevronDown, X } from "lucide-react";

type Option = { value: string; label: string };

export function SearchableSelect({
  name,
  options,
  placeholder = "-- Select --",
  required,
  defaultValue = "",
  onChange,
}: {
  name?: string;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const id = useId();
  const findOption = (val: string) => options.find((o) => o.value === val) ?? null;

  const [search, setSearch] = useState(() => findOption(defaultValue)?.label ?? "");
  const [selected, setSelected] = useState<Option | null>(() => findOption(defaultValue));
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state when defaultValue changes (e.g. URL param update via router.push)
  useEffect(() => {
    const opt = findOption(defaultValue);
    setSelected(opt);
    setSearch(opt?.label ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);

  const filtered = search.trim() && !selected
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options.slice(0, 50);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        if (!selected) setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [selected]);

  const handleSelect = (opt: Option) => {
    setSelected(opt);
    setSearch(opt.label);
    setOpen(false);
    onChange?.(opt.value);
  };

  const handleClear = () => {
    setSelected(null);
    setSearch("");
    inputRef.current?.focus();
    setOpen(true);
    onChange?.("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setSelected(null);
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      {name && <input type="hidden" name={name} value={selected?.value ?? ""} required={required} />}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={search}
          placeholder={placeholder}
          autoComplete="off"
          className="input-base w-full pr-8"
          onFocus={() => { setOpen(true); if (selected) setSearch(""); }}
          onBlur={() => { if (selected) setSearch(selected.label); }}
          onChange={handleInputChange}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selected && (
            <button type="button" onClick={handleClear} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </div>

      {open && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-400 text-center">ไม่พบ</li>
          ) : (
            filtered.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    opt.value === selected?.value ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium" : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
