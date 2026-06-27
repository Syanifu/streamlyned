"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasUnreadDmMessages } from "@/lib/chat-seen";
import {
  Home,
  Folder,
  MessageSquare,
  Settings,
  User,
  Compass,
  Calendar as CalendarIcon,
  LineChart,
  Sparkles,
  Download
} from "lucide-react";
import ThemeToggle from "./theme-toggle";
import BionicToggle from "./bionic-toggle";

interface DmChatInfo {
  dmGroupId: string;
  latestMessageAt: string | null;
}

interface NavigationCapsuleProps {
  role: string;
  avatarUrl: string | null;
  userName: string;
  theme: "light" | "dark";
  colorBg?: string;
  userId?: string;
  dmChatInfo?: DmChatInfo[];
}

export default function NavigationCapsule({
  role,
  avatarUrl,
  userName,
  theme,
  colorBg,
  userId,
  dmChatInfo,
}: NavigationCapsuleProps) {
  const pathname = usePathname();
  const isClient = role === "CLIENT";
  const [hasUnreadDms, setHasUnreadDms] = useState(false);

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

  const getLinkClass = (active: boolean, customColorClass?: string) => {
    const baseClass = "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 select-none";
    if (active) return `${baseClass} bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-extrabold shadow-sm`;
    if (customColorClass) return `${baseClass} ${customColorClass} hover:bg-neutral-100 dark:hover:bg-neutral-800/60`;
    return `${baseClass} text-neutral-600 hover:text-neutral-900 hover:bg-neutral-150 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/60`;
  };

  const getMobileLinkClass = (active: boolean) =>
    `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 select-none min-w-[52px] ${
      active
        ? "text-neutral-900 dark:text-white"
        : "text-neutral-400 dark:text-neutral-500"
    }`;

  return (
    <>
      {/* ── Desktop pill (md+) ─────────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-2.5 bg-surface border border-border-custom hover:border-neutral-400 dark:hover:border-neutral-700 px-3.5 py-1.5 rounded-full shadow-lg transition-all duration-200 max-w-full overflow-x-auto no-scrollbar">

        {!isClient && (role === "OWNER" || role === "ADMIN") && (
          <>
            <Link href="/dashboard/settings" className={getLinkClass(isActive("/dashboard/settings", true))}>
              <Settings size={13} />
              <span>Settings</span>
            </Link>
            <Link href="/dashboard/import" className={getLinkClass(isActive("/dashboard/import", true))}>
              <Download size={13} />
              <span>Import</span>
            </Link>
          </>
        )}

        {role === "super_admin" && (
          <Link href="/dashboard/ask-ai" className={getLinkClass(isActive("/dashboard/ask-ai", true))}>
            <Sparkles size={13} className={isActive("/dashboard/ask-ai", true) ? "" : "animate-pulse"} />
            <span>Ask Ashy</span>
          </Link>
        )}

        <Link href="/dashboard/projects" className={getLinkClass(isActive("/dashboard/projects"))}>
          <Folder size={13} />
          <span>Projects</span>
        </Link>

        <Link href="/dashboard/everything" className={getLinkClass(isActive("/dashboard/everything", true))}>
          <Compass size={13} />
          <span>Everything</span>
        </Link>

        <Link href="/dashboard" className={getLinkClass(isActive("/dashboard", true))}>
          <Home size={13} />
          <span>Today</span>
        </Link>

        <Link href="/dashboard/calendar" className={getLinkClass(isActive("/dashboard/calendar", true))}>
          <CalendarIcon size={13} />
          <span>Calendar</span>
        </Link>

        {!isClient && (
          <>
            <Link href="/dashboard/dm" className={getLinkClass(isActive("/dashboard/dm"))}>
              <span className="relative inline-flex">
                <MessageSquare size={13} />
                {hasUnreadDms && !isActive("/dashboard/dm") && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                )}
              </span>
              <span>Conversations</span>
            </Link>
            <Link href="/dashboard/reports" className={getLinkClass(isActive("/dashboard/reports", true))}>
              <LineChart size={13} />
              <span>Reports</span>
            </Link>
          </>
        )}

        <span className="w-px h-4 bg-neutral-350 dark:bg-neutral-800 shrink-0 self-center" />
        <div className="flex items-center gap-1.5 shrink-0">
          <BionicToggle />
          <ThemeToggle initialTheme={theme} initialColor={colorBg} />
        </div>
        <span className="w-px h-4 bg-neutral-350 dark:bg-neutral-800 shrink-0 self-center" />

        <Link
          href="/dashboard/profile"
          className={`flex items-center gap-1.5 pl-1.5 pr-3.5 py-1.5 rounded-full transition-all duration-200 shrink-0 select-none ${
            isActive("/dashboard/profile", true)
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-extrabold shadow-sm"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-150 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/60"
          }`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="w-5 h-5 rounded-full bg-neutral-200 shrink-0 border border-border-custom" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 border border-border-custom">
              <User size={10} className="text-neutral-600" />
            </div>
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider">Profile</span>
        </Link>
      </div>

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

          {!isClient && (role === "OWNER" || role === "ADMIN") && (
            <Link href="/dashboard/import" className={getMobileLinkClass(isActive("/dashboard/import", true))}>
              <Download size={20} strokeWidth={isActive("/dashboard/import", true) ? 2.5 : 1.8} />
              <span className="text-[9px] font-semibold uppercase tracking-wider">Import</span>
            </Link>
          )}

          <Link href="/dashboard/profile" className={getMobileLinkClass(isActive("/dashboard/profile", true))}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className={`w-5 h-5 rounded-full border ${isActive("/dashboard/profile", true) ? "border-neutral-900 dark:border-white" : "border-border-custom"}`} />
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
