import { requireSession } from "@/lib/session";
import { getPermissions } from "@/lib/permissions";
import { getConfig } from "@/lib/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FadeUp } from "@/components/ui/motion";
import { ReportBugForm } from "@/components/report-bug/report-bug-form";

export default async function NewReportBugPage() {
  const session = await requireSession();
  const perms = await getPermissions(session.role);
  if (!perms.canAccessReportBug) redirect("/projects");

  const defaultPriority = await getConfig("issue.defaultPriority") ?? "medium";

  return (
    <div className="max-w-2xl space-y-6">
      <FadeUp>
        <div className="flex items-center gap-3">
          <Link
            href="/report-bug"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Link>
        </div>
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Report Bug</h1>
          <p className="text-sm text-gray-400 mt-0.5">แจ้งปัญหาที่พบในระบบ</p>
        </div>
      </FadeUp>

      <FadeUp delay={0.05}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <ReportBugForm defaultPriority={defaultPriority} />
        </div>
      </FadeUp>
    </div>
  );
}
