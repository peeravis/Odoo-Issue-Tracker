"use client";

import { useState, useTransition } from "react";
import { testEmailConnection } from "@/app/actions/config";
import { Mail, CheckCircle, XCircle, Loader2 } from "lucide-react";

export function TestEmailButton() {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const handleTest = () => {
    setResult(null);
    startTransition(async () => {
      const res = await testEmailConnection();
      setResult(res);
    });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={handleTest}
        disabled={pending}
        className="btn-secondary inline-flex items-center gap-2"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {pending ? "กำลังทดสอบ..." : "Test Connection"}
      </button>
      {result && (
        <div className={`flex items-center gap-2 text-sm font-medium ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {result.ok ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
          {result.message}
        </div>
      )}
    </div>
  );
}
