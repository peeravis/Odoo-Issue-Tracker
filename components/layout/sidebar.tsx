"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Bug,
  Users,
  LogOut,
  Building2,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";
import { useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  userRole: string;
  userName: string;
}

const memberItems = [
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/issues", label: "Issues", icon: Bug },
];

const adminOnlyItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/master-data", label: "Master Data", icon: Database },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/users", label: "Users", icon: Users },
];

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  const isAdmin = userRole === "admin";

  const allItems = isAdmin
    ? [adminOnlyItems[0], ...memberItems, adminOnlyItems[1], adminOnlyItems[2], adminOnlyItems[3]]
    : memberItems;

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-950 flex flex-col border-r border-white/5">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
          <Bug className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-none">Issue Tracker</p>
          <p className="text-xs text-gray-500 mt-0.5">Project Management</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/5" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {allItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 group",
                active
                  ? "text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-indigo-600 rounded-xl"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="h-4.5 w-4.5 relative z-10 flex-shrink-0" />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/5" />

      {/* User */}
      <div className="px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-xl">
          <div className="h-8 w-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-sm font-semibold flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate leading-none">{userName}</p>
            <p className="text-xs text-gray-500 capitalize mt-0.5">{userRole}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={pending}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors duration-150 disabled:opacity-50"
        >
          <LogOut className="h-4.5 w-4.5" />
          {pending ? "Logging out..." : "Logout"}
        </button>
      </div>
    </aside>
  );
}
