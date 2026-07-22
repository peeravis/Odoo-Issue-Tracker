"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { logger } from "@/lib/logger";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Dashboard error boundary caught", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="h-14 w-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">เกิดข้อผิดพลาด</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {error.digest ? `Error ID: ${error.digest}` : "กรุณาลองใหม่อีกครั้ง"}
        </p>
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
      >
        ลองใหม่
      </button>
    </div>
  );
}
