"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";

type ImportResult = {
  created: number;
  updated: number;
  skipped: string[];
  errors: string[];
};

export function ImportUsersButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const router = useRouter();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/users/import", { method: "POST", body: fd });
      const data: ImportResult = await res.json();
      setResult(data);
      router.refresh();
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        <Upload className="h-4 w-4" />
        {loading ? "กำลัง import..." : "Import Excel"}
      </button>

      {result && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-lg z-20 text-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-gray-900 dark:text-white">ผลการ Import</p>
            <button onClick={() => setResult(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1">
            <p className="text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="font-medium">✓</span> สร้างใหม่ {result.created} คน
            </p>
            <p className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <span className="font-medium">↻</span> อัปเดต {result.updated} คน
            </p>
            {result.skipped.length > 0 && (
              <div className="mt-2">
                <p className="text-yellow-600 dark:text-yellow-400 font-medium text-xs">คำเตือน:</p>
                <ul className="text-xs text-yellow-600 dark:text-yellow-400 space-y-0.5 mt-1">
                  {result.skipped.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-red-500 font-medium text-xs">ข้อผิดพลาด:</p>
                <ul className="text-xs text-red-500 space-y-0.5 mt-1">
                  {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
