import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";
import { DarkModeToggle } from "@/components/layout/dark-mode-toggle";
import { PageWrapper } from "@/components/layout/page-wrapper";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950">
      <Sidebar userRole={session.role} userName={session.name} />
      <div className="pl-64">
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-700/80 px-6 py-3 flex items-center justify-between">
          <div />
          <DarkModeToggle />
        </header>
        <main className="p-6 max-w-screen-2xl">
          <PageWrapper>{children}</PageWrapper>
        </main>
      </div>
    </div>
  );
}
