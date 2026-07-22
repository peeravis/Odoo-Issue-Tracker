"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">เกิดข้อผิดพลาดร้ายแรง</h2>
          <p className="text-gray-500 mb-4">กรุณา Reload หน้านี้</p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          >
            ลองใหม่
          </button>
        </div>
      </body>
    </html>
  );
}
