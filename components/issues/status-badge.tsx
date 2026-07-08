import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import type { IssueStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <Badge
      dot
      label={STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}
      className={STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? ""}
    />
  );
}
