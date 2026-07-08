export default function IssueDetailLoading() {
  return (
    <div className="max-w-5xl space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 bg-gray-100 dark:bg-gray-700/50 rounded" />
              <div className="h-5 w-14 bg-gray-100 dark:bg-gray-700/50 rounded-full" />
              <div className="h-5 w-16 bg-gray-100 dark:bg-gray-700/50 rounded-full" />
            </div>
            <div className="h-6 w-96 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3.5 w-48 bg-gray-100 dark:bg-gray-700/40 rounded" />
          </div>
        </div>
        <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
            <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-gray-100 dark:bg-gray-700/40 rounded" />
              <div className="h-3.5 w-5/6 bg-gray-100 dark:bg-gray-700/40 rounded" />
              <div className="h-3.5 w-4/6 bg-gray-100 dark:bg-gray-700/40 rounded" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 h-48" />
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 h-32" />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex justify-between gap-2">
                <div className="h-3 w-20 bg-gray-100 dark:bg-gray-700/40 rounded" />
                <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700/40 rounded" />
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 h-48" />
        </div>
      </div>
    </div>
  );
}
