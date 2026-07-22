"use client";

import { useState } from "react";
import { CalendarDays, Download, Loader2 } from "lucide-react";
import { STATUS_LABELS } from "@/lib/utils";
import type { IssueStatus } from "@/lib/types";

const STATUS_COLOR: Record<IssueStatus, string> = {
  open:                "bg-blue-500",
  in_progress:         "bg-purple-500",
  wait_for_user_check: "bg-orange-400",
  resolved:            "bg-emerald-500",
  closed:              "bg-slate-400",
  reopened:            "bg-rose-500",
};

interface StatusCount { status: string; _count: number }

interface DailyReportProps {
  todayNewCount: number;
  todayByStatus: StatusCount[];
  pendingTotal: number;
  pendingByStatus: StatusCount[];
  todayResolvedCount: number;
  totalIssues: number;
  projectId?: string;
  dateLabel: string;
  from?: string;
  to?: string;
}

export function DailyReport({
  todayNewCount,
  todayByStatus,
  pendingTotal,
  pendingByStatus,
  todayResolvedCount,
  totalIssues,
  projectId,
  dateLabel,
  from,
  to,
}: DailyReportProps) {
  const [loading, setLoading] = useState(false);
  const isRange = !!(from || to);

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  const handleExport = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const exportFrom = from || today;
      const exportTo = to || today;
      const params = new URLSearchParams({ from: exportFrom, to: exportTo, daily: "1" });
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/dashboard/report?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${exportFrom}${exportFrom !== exportTo ? `_to_${exportTo}` : ""}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/70 dark:from-indigo-950/20 dark:via-gray-800/80 dark:to-violet-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 p-6 shadow-sm">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-indigo-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              {isRange ? "Period Report" : "Daily Report"}
            </h2>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{dateLabel}</p>
        </div>
        <button
          onClick={handleExport}
          disabled={loading}
          className="btn-primary flex items-center gap-2 text-sm px-4 py-2 self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {isRange ? "Export ช่วงนี้" : "Export วันนี้"}
        </button>
      </div>

      {/* 3 stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          {
            label: isRange ? "เปิดในช่วงนี้" : "เปิดวันนี้",
            value: todayNewCount,
            sub: `${pct(todayNewCount, totalIssues)}% ของทั้งหมด`,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30",
          },
          {
            label: "ค้างอยู่ทั้งหมด",
            value: pendingTotal,
            sub: `${pct(pendingTotal, totalIssues)}% ของทั้งหมด`,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30",
          },
          {
            label: isRange ? "Resolve ในช่วงนี้" : "Resolve วันนี้",
            value: todayResolvedCount,
            sub: `${pct(todayResolvedCount, totalIssues)}% ของทั้งหมด`,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 sm:p-4 ${s.bg}`}>
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">{s.label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Today opened by status */}
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {isRange ? "เคสที่เปิดในช่วงนี้" : "เคสที่เปิดวันนี้"}
          </p>
          {todayNewCount > 0 ? (
            <>
              {/* Stacked bar */}
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
                {todayByStatus.map((s) => (
                  <div
                    key={s.status}
                    title={`${STATUS_LABELS[s.status as IssueStatus]}: ${s._count}`}
                    style={{ width: `${pct(s._count, todayNewCount)}%` }}
                    className={STATUS_COLOR[s.status as IssueStatus] ?? "bg-gray-300"}
                  />
                ))}
              </div>
              <div className="space-y-2">
                {todayByStatus.map((s) => (
                  <div key={s.status} className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLOR[s.status as IssueStatus] ?? "bg-gray-300"}`} />
                    <span className="flex-1 text-gray-600 dark:text-gray-400">
                      {STATUS_LABELS[s.status as IssueStatus] ?? s.status}
                    </span>
                    <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{s._count}</span>
                    <span className="text-gray-400 w-20 text-right tabular-nums">
                      {pct(s._count, todayNewCount)}% วันนี้
                    </span>
                    <span className="text-indigo-400 w-20 text-right tabular-nums">
                      {pct(s._count, totalIssues)}% ทั้งหมด
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">รวม {todayNewCount} เคส ({pct(todayNewCount, totalIssues)}% ของ {totalIssues} เคสทั้งหมด)</p>
            </>
          ) : (
            <p className="text-sm text-gray-400 py-3">ไม่มีเคสที่เปิดวันนี้</p>
          )}
        </div>

        {/* Remaining/pending by status */}
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            เคสค้างอยู่ — {pendingTotal} เคส ({pct(pendingTotal, totalIssues)}% ของทั้งหมด)
          </p>
          {pendingTotal > 0 ? (
            <>
              {/* Stacked bar (% of total issues) */}
              <div className="relative h-3 bg-gray-100 dark:bg-gray-700/60 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${pct(pendingTotal, totalIssues)}%` }}
                />
              </div>
              <div className="space-y-2.5">
                {[...pendingByStatus].sort((a, b) => b._count - a._count).map((s) => (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${STATUS_COLOR[s.status as IssueStatus] ?? "bg-gray-300"}`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {STATUS_LABELS[s.status as IssueStatus] ?? s.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold tabular-nums text-gray-900 dark:text-white">{s._count}</span>
                        <span className="text-xs text-gray-400 tabular-nums w-16 text-right">
                          {pct(s._count, totalIssues)}% ทั้งหมด
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${STATUS_COLOR[s.status as IssueStatus] ?? "bg-gray-300"}`}
                        style={{ width: `${pct(s._count, pendingTotal)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 py-3">ไม่มีเคสค้างอยู่ 🎉</p>
          )}
        </div>

      </div>
    </div>
  );
}
