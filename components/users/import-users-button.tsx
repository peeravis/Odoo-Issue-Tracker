"use client";

import { useRef, useState } from "react";
import { Upload, X, FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";

type Step = "idle" | "modal" | "loading_sheets" | "ready" | "importing" | "done";

type ImportResult = {
  created: number;
  updated: number;
  skipped: string[];
  errors: string[];
};

export function ImportUsersButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [extraRole, setExtraRole] = useState<"" | "aspd" | "vendor">("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStep("loading_sheets");

    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/users/import/sheets", { method: "POST", body: fd });
    const data = await res.json();
    const sheetList: string[] = data.sheets ?? [];
    setSheets(sheetList);
    setSelectedSheet(sheetList[0] ?? "");
    setStep("ready");
  };

  const handleImport = async () => {
    if (!file || !selectedSheet) return;
    setStep("importing");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("sheetName", selectedSheet);
    fd.append("extraRole", extraRole);

    const res = await fetch("/api/users/import", { method: "POST", body: fd });
    const data: ImportResult = await res.json();
    setResult(data);
    setStep("done");
    router.refresh();
  };

  const reset = () => {
    setStep("idle");
    setFile(null);
    setSheets([]);
    setSelectedSheet("");
    setExtraRole("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <button
        onClick={() => setStep("modal")}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Upload className="h-4 w-4" />
        Import Excel
      </button>

      {step !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Import Users</h2>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            {step === "done" && result ? (
              <>
                <div className="space-y-2 text-sm">
                  <p className="text-green-600 dark:text-green-400">✓ สร้างใหม่ {result.created} คน</p>
                  <p className="text-blue-600 dark:text-blue-400">↻ อัปเดต {result.updated} คน</p>
                  {result.skipped.length > 0 && (
                    <div className="mt-2">
                      <p className="text-yellow-600 dark:text-yellow-400 font-medium text-xs mb-1">คำเตือน:</p>
                      <ul className="text-xs text-yellow-600 dark:text-yellow-400 space-y-0.5">
                        {result.skipped.map((s, i) => <li key={i}>• {s}</li>)}
                      </ul>
                    </div>
                  )}
                  {result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-red-500 font-medium text-xs mb-1">ข้อผิดพลาด:</p>
                      <ul className="text-xs text-red-500 space-y-0.5">
                        {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
                <button onClick={reset} className="mt-5 w-full btn-primary py-2 text-sm">ปิด</button>
              </>
            ) : (
              <div className="space-y-5">
                {/* File picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    ไฟล์ Excel <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-gray-100 dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200 dark:hover:file:bg-gray-600 cursor-pointer"
                  />
                  {file && (
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <FileSpreadsheet className="h-3 w-3" />
                      {file.name}
                    </p>
                  )}
                </div>

                {/* Sheet selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Sheet <span className="text-red-500">*</span>
                  </label>
                  {step === "loading_sheets" ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500">กำลังโหลด sheet...</p>
                  ) : (
                    <select
                      value={selectedSheet}
                      onChange={(e) => setSelectedSheet(e.target.value)}
                      disabled={sheets.length === 0}
                      className="input-base w-full disabled:opacity-50"
                    >
                      {sheets.length === 0
                        ? <option value="">-- เลือกไฟล์ก่อน --</option>
                        : sheets.map((s) => <option key={s} value={s}>{s}</option>)
                      }
                    </select>
                  )}
                </div>

                {/* ExtraRole */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ประเภทผู้ใช้
                  </label>
                  <div className="flex gap-4">
                    {([
                      { value: "", label: "ไม่ระบุ" },
                      { value: "aspd", label: "ASPD" },
                      { value: "vendor", label: "Vendor" },
                    ] as const).map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                          type="radio"
                          name="extraRole"
                          value={value}
                          checked={extraRole === value}
                          onChange={() => setExtraRole(value)}
                          className="accent-indigo-600"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={reset} className="flex-1 btn-secondary py-2 text-sm">ยกเลิก</button>
                  <button
                    onClick={handleImport}
                    disabled={step !== "ready" || !selectedSheet}
                    className="flex-1 btn-primary py-2 text-sm disabled:opacity-50"
                  >
                    {step === "importing" ? "กำลัง Import..." : "Import"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
