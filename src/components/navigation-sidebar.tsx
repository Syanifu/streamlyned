"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasUnreadDmMessages } from "@/lib/chat-seen";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Home,
  Folder,
  MessageSquare,
  Settings,
  User,
  Compass,
  Calendar as CalendarIcon,
  LineChart,
  Sparkles,
  Download,
  Database,
  Coins,
  Tag,
} from "lucide-react";


interface DmChatInfo {
  dmGroupId: string;
  latestMessageAt: string | null;
}

interface NavigationSidebarProps {
  role: string;
  avatarUrl: string | null;
  userName: string;
  theme: "light" | "dark";
  colorBg?: string;
  userId?: string;
  dmChatInfo?: DmChatInfo[];
}

export default function NavigationSidebar({
  role,
  avatarUrl,
  userName,
  theme,
  colorBg,
  userId,
  dmChatInfo,
}: NavigationSidebarProps) {
  const pathname = usePathname();
  const isClient = role === "CLIENT";
  const [hasUnreadDms, setHasUnreadDms] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  };

  useEffect(() => {
    if (!userId || !dmChatInfo?.length) return;
    const anyUnread = dmChatInfo.some((info) =>
      hasUnreadDmMessages(userId, info.dmGroupId, info.latestMessageAt)
    );
    setHasUnreadDms(anyUnread);
  }, [userId, dmChatInfo]);

  const isActive = (path: string, exact = false) => {
    if (exact) return pathname === path;
    return pathname.startsWith(path);
  };

  const getLinkClass = (active: boolean) => {
    const baseClass =
      "flex items-center gap-3 text-xs font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all duration-200 select-none relative group";
    if (active) {
      return `${baseClass} bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-extrabold shadow-md`;
    }
    return `${baseClass} text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/50`;
  };

  const getMobileLinkClass = (active: boolean) =>
    `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 select-none min-w-[52px] ${
      active ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-neutral-500"
    }`;

  const navigationItems = [
    {
      href: "/dashboard",
      label: "Today",
      icon: <Home size={16} />,
      exact: true,
      visible: true,
    },
    {
      href: "/dashboard/projects",
      label: "Projects",
      icon: <Folder size={16} />,
      exact: false,
      visible: true,
    },
    {
      href: "/dashboard/everything",
      label: "Everything",
      icon: <Compass size={16} />,
      exact: true,
      visible: true,
    },
    {
      href: "/dashboard/calendar",
      label: "Calendar",
      icon: <CalendarIcon size={16} />,
      exact: true,
      visible: true,
    },
    {
      href: "/dashboard/inventory",
      label: "Inventory",
      icon: <Database size={16} />,
      exact: false,
      visible: !isClient,
    },
    {
      href: "/dashboard/accounts",
      label: "Accounts",
      icon: <Coins size={16} />,
      exact: false,
      visible: !isClient,
    },
    {
      href: "/dashboard/payroll",
      label: "Payroll",
      icon: <User size={16} />,
      exact: false,
      visible: !isClient,
    },
    {
      href: "/dashboard/tags",
      label: "Tags Manager",
      icon: <Tag size={16} />,
      exact: false,
      visible: !isClient,
    },
    {
      href: "/dashboard/dm",
      label: "Chat",
      icon: (
        <span className="relative inline-flex">
          <MessageSquare size={16} />
          {hasUnreadDms && !isActive("/dashboard/dm") && (
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
          )}
        </span>
      ),
      exact: false,
      visible: !isClient,
    },
    {
      href: "/dashboard/reports",
      label: "Reports",
      icon: <LineChart size={16} />,
      exact: true,
      visible: !isClient,
    },
    {
      href: "/dashboard/ask-ai",
      label: "Ask Ashy",
      icon: <Sparkles size={16} />,
      exact: true,
      visible: role === "super_admin",
    },
    {
      href: "/dashboard/import",
      label: "Import",
      icon: <Download size={16} />,
      exact: true,
      visible: !isClient && (role === "OWNER" || role === "ADMIN"),
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: <Settings size={16} />,
      exact: true,
      visible: !isClient && (role === "OWNER" || role === "ADMIN"),
    },
  ];

  return (
    <>
      {/* ── Desktop Sidebar (md+) ─────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col h-full bg-surface border-r border-border-custom shadow-lg transition-all duration-350 ease-in-out select-none shrink-0 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Sidebar Header / Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border-custom shrink-0">
          {!isCollapsed && (
            <div className="flex flex-col pl-2">
              <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 tracking-tight leading-tight">
                Streamlyned
              </span>
              <span className="text-[8px] text-neutral-400 dark:text-neutral-500 font-medium">
                developed by Scaling Dynamics
              </span>
            </div>
          )}
          {isCollapsed && (
            <span className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 font-extrabold text-sm ml-2">
              S
            </span>
          )}
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500 ml-auto"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto no-scrollbar">
          {navigationItems
            .filter((item) => item.visible)
            .map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={getLinkClass(active)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="shrink-0">{item.icon}</div>
                  {!isCollapsed && (
                    <span className="font-semibold text-[10px] tracking-wider uppercase">
                      {item.label}
                    </span>
                  )}
                  {isCollapsed && (
                    <div className="absolute left-16 bg-neutral-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
        </nav>

        {/* Sidebar Footer / User Profile & Controls */}
        <div className="p-3 border-t border-border-custom shrink-0 bg-neutral-50/50 dark:bg-neutral-900/20">

          {/* Profile capsule */}
          <Link
            href="/dashboard/profile"
            className={`flex items-center gap-3 p-2 rounded-2xl hover:bg-neutral-150 dark:hover:bg-neutral-800/60 transition-all ${
              isActive("/dashboard/profile", true) ? "bg-neutral-100 dark:bg-neutral-800" : ""
            }`}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="w-8 h-8 rounded-full border border-border-custom bg-neutral-200 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 border border-border-custom">
                <User size={14} className="text-neutral-600" />
              </div>
            )}
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-neutral-800 dark:text-neutral-200 truncate uppercase tracking-wider">
                  {userName}
                </div>
                <div className="text-[8px] text-neutral-400 font-mono truncate uppercase">
                  {role}
                </div>
              </div>
            )}
          </Link>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar (< md) ───────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface/95 backdrop-blur-md border-t border-border-custom pb-safe">
        <div className="flex items-center justify-around px-2 pt-1 pb-2">
          <Link href="/dashboard" className={getMobileLinkClass(isActive("/dashboard", true))}>
            <Home size={20} strokeWidth={isActive("/dashboard", true) ? 2.5 : 1.8} />
            <span className="text-[9px] font-semibold uppercase tracking-wider">Today</span>
          </Link>

          <Link href="/dashboard/projects" className={getMobileLinkClass(isActive("/dashboard/projects"))}>
            <Folder size={20} strokeWidth={isActive("/dashboard/projects") ? 2.5 : 1.8} />
            <span className="text-[9px] font-semibold uppercase tracking-wider">Projects</span>
          </Link>

          <Link href="/dashboard/calendar" className={getMobileLinkClass(isActive("/dashboard/calendar", true))}>
            <CalendarIcon size={20} strokeWidth={isActive("/dashboard/calendar", true) ? 2.5 : 1.8} />
            <span className="text-[9px] font-semibold uppercase tracking-wider">Calendar</span>
          </Link>

          {!isClient && (
            <Link href="/dashboard/dm" className={getMobileLinkClass(isActive("/dashboard/dm"))}>
              <span className="relative inline-flex">
                <MessageSquare size={20} strokeWidth={isActive("/dashboard/dm") ? 2.5 : 1.8} />
                {hasUnreadDms && !isActive("/dashboard/dm") && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-surface" />
                )}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider">Chat</span>
            </Link>
          )}

          <Link href="/dashboard/everything" className={getMobileLinkClass(isActive("/dashboard/everything", true))}>
            <Compass size={20} strokeWidth={isActive("/dashboard/everything", true) ? 2.5 : 1.8} />
            <span className="text-[9px] font-semibold uppercase tracking-wider">All</span>
          </Link>

          <Link href="/dashboard/profile" className={getMobileLinkClass(isActive("/dashboard/profile", true))}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className={`w-5 h-5 rounded-full border ${
                  isActive("/dashboard/profile", true) ? "border-neutral-900 dark:border-white" : "border-border-custom"
                }`}
              />
            ) : (
              <User size={20} strokeWidth={isActive("/dashboard/profile", true) ? 2.5 : 1.8} />
            )}
            <span className="text-[9px] font-semibold uppercase tracking-wider">Profile</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
