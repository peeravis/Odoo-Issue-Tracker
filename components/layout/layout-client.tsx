"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { DarkModeToggle } from "./dark-mode-toggle";
import { PageWrapper } from "./page-wrapper";

interface LayoutClientProps {
  children: React.ReactNode;
  userRole: string;
  userName: string;
  appName?: string;
  logoUrl?: string;
  canAccessDashboard?: boolean;
  canManageMasterData?: boolean;
  canManageUsers?: boolean;
  canAccessConfig?: boolean;
  canManageProjects?: boolean;
}

export function LayoutClient({
  children,
  userRole,
  userName,
  appName,
  logoUrl,
  canAccessDashboard,
  canManageMasterData,
  canManageUsers,
  canAccessConfig,
  canManageProjects,
}: LayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        userRole={userRole}
        userName={userName}
        appName={appName}
        logoUrl={logoUrl}
        canAccessDashboard={canAccessDashboard}
        canManageMasterData={canManageMasterData}
        canManageUsers={canManageUsers}
        canAccessConfig={canAccessConfig}
        canManageProjects={canManageProjects}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-700/80 px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden md:block" />
          <DarkModeToggle />
        </header>
        <main className="p-4 md:p-6 max-w-screen-2xl">
          <PageWrapper>{children}</PageWrapper>
        </main>
      </div>
    </>
  );
}
