export default function IssuesLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-4 w-24 bg-gray-100 dark:bg-gray-700/50 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 bg-gray-100 dark:bg-gray-700/50 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 overflow-hidden">
        <div className="border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/80 dark:bg-gray-900/40 px-4 py-3">
          <div className="flex gap-8">
            {["w-16", "w-24", "w-48", "w-20", "w-16", "w-20"].map((w, i) => (
              <div key={i} className={`h-3 ${w} bg-gray-200 dark:bg-gray-700 rounded`} />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3.5 flex items-center gap-6 border-b border-gray-50 dark:border-gray-700/30">
            <div className="h-4 w-4 bg-gray-100 dark:bg-gray-700/50 rounded" />
            <div className="h-3.5 w-16 bg-gray-100 dark:bg-gray-700/50 rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-2.5 w-24 bg-gray-100 dark:bg-gray-700/40 rounded" />
            </div>
            <div className="h-5 w-14 bg-gray-100 dark:bg-gray-700/50 rounded-full" />
            <div className="h-5 w-16 bg-gray-100 dark:bg-gray-700/50 rounded-full" />
            <div className="h-3.5 w-20 bg-gray-100 dark:bg-gray-700/40 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
