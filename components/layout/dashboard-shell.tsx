"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { DarkModeToggle } from "./dark-mode-toggle";
import { PageWrapper } from "./page-wrapper";
import type { RolePermissions } from "@/lib/permissions";

interface DashboardShellProps {
  children: React.ReactNode;
  userRole: string;
  userName: string;
  appName?: string;
  logoUrl?: string;
  permissions: RolePermissions;
}

export function DashboardShell({
  children,
  userRole,
  userName,
  appName,
  logoUrl,
  permissions,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        userRole={userRole}
        userName={userName}
        appName={appName}
        logoUrl={logoUrl}
        permissions={permissions}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="lg:pl-64 min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-700/80 px-4 lg:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="เปิดเมนู"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <DarkModeToggle />
        </header>
        <main className="flex-1 p-4 lg:p-6 max-w-screen-2xl">
          <PageWrapper>{children}</PageWrapper>
        </main>
      </div>
    </div>
  );
}
