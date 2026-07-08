import { Badge } from "@/components/ui/badge";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/utils";
import type { IssuePriority } from "@/lib/types";

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  return (
    <Badge
      dot
      label={PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] ?? priority}
      className={PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] ?? ""}
    />
  );
}
