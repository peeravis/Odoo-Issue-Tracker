"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/ui/motion";

interface StatsCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

export function StatsCard({ label, value, icon, color, delay = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
      whileHover={{ y: -3, transition: { duration: 0.18, ease: "easeOut" } }}
      className="group bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 p-5 flex items-center gap-4 shadow-sm hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 cursor-default"
    >
      <div className={cn(
        "h-12 w-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
        color
      )}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
          <CountUp value={value} />
        </p>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate mt-1">{label}</p>
      </div>
    </motion.div>
  );
}
