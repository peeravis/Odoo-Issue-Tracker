import { cn } from "@/lib/utils";

interface BadgeProps {
  label: string;
  className?: string;
  dot?: boolean;
}

export function Badge({ label, className, dot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60 flex-shrink-0" />}
      {label}
    </span>
  );
}
