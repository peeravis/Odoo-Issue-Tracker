"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";

export function ImportClientsButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const router = useRouter();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/clients/import", { method: "POST", body: fd });
      const data = await res.json();
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
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-lg z-10 text-sm">
          <p className="font-medium text-gray-900 dark:text-white mb-2">Import สำเร็จ</p>
          <p className="text-green-600 dark:text-green-400">✓ สร้างใหม่ {result.created} รายการ</p>
          <p className="text-blue-600 dark:text-blue-400">↻ อัปเดต {result.updated} รายการ</p>
          {result.errors.length > 0 && (
            <p className="text-red-500 mt-1">✗ ล้มเหลว: {result.errors.join(", ")}</p>
          )}
          <button onClick={() => setResult(null)} className="mt-2 text-xs text-gray-400 hover:text-gray-600">ปิด</button>
        </div>
      )}
    </div>
  );
}
