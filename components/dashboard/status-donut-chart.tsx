type Segment = {
  label: string;
  count: number;
  color: string;
};

export function StatusDonutChart({
  segments,
  total,
}: {
  segments: Segment[];
  total: number;
}) {
  const r = 60;
  const cx = 80;
  const cy = 80;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * r;

  let cumulativeLen = 0;
  const arcs = segments
    .filter((s) => s.count > 0)
    .map((s) => {
      const arcLen = (s.count / total) * circumference;
      // dashoffset starts at circumference*0.25 so segment begins at 12 o'clock
      const offset = circumference * 0.25 - cumulativeLen;
      cumulativeLen += arcLen;
      return { ...s, arcLen, offset };
    });

  return (
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {total === 0 ? (
            <circle r={r} cx={cx} cy={cy} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
          ) : (
            arcs.map((arc, i) => (
              <circle
                key={i}
                r={r}
                cx={cx}
                cy={cy}
                fill="none"
                stroke={arc.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${arc.arcLen} ${circumference}`}
                strokeDashoffset={arc.offset}
              />
            ))
          )}
          <text x={cx} y={cy - 6} textAnchor="middle" fill="currentColor" fontSize="22" fontWeight="bold" className="text-gray-900 dark:text-white">
            {total}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="11">
            issues
          </text>
        </svg>
      </div>

      <div className="flex-1 space-y-2 min-w-0">
        {arcs.map((arc) => (
          <div key={arc.label} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: arc.color }}
            />
            <span className="text-gray-600 dark:text-gray-400 flex-1 truncate">{arc.label}</span>
            <span className="font-medium text-gray-900 dark:text-white tabular-nums">{arc.count}</span>
            <span className="text-gray-400 w-10 text-right tabular-nums">
              {Math.round((arc.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
