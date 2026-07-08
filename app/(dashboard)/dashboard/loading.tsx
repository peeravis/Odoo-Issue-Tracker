export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg" />

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-7 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-20 bg-gray-100 dark:bg-gray-700/50 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-6 h-52" />
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-6 py-3 flex items-center gap-4 border-b border-gray-50 dark:border-gray-700/30">
            <div className="h-4 w-16 bg-gray-100 dark:bg-gray-700/50 rounded" />
            <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700/50 rounded" />
            <div className="h-5 w-14 bg-gray-100 dark:bg-gray-700/50 rounded-full" />
            <div className="h-5 w-16 bg-gray-100 dark:bg-gray-700/50 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
