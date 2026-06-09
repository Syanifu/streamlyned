"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Folder, 
  MessageSquare, 
  Settings, 
  User,
  Compass,
  Calendar as CalendarIcon,
  LineChart,
  Sparkles
} from "lucide-react";
import ThemeToggle from "./theme-toggle";

interface NavigationCapsuleProps {
  role: string;
  avatarUrl: string | null;
  userName: string;
  theme: "light" | "dark";
}

export default function NavigationCapsule({
  role,
  avatarUrl,
  userName,
  theme,
}: NavigationCapsuleProps) {
  const pathname = usePathname();
  const isClient = role === "CLIENT";

  // Helper to determine if path is active
  const isActive = (path: string, exact = false) => {
    if (exact) {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  // Common styling for links in Segmented Control style
  const getLinkClass = (active: boolean, customColorClass?: string) => {
    const baseClass = "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 select-none";
    if (active) {
      return `${baseClass} bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-extrabold shadow-sm`;
    }
    if (customColorClass) {
      return `${baseClass} ${customColorClass} hover:bg-neutral-100 dark:hover:bg-neutral-800/60`;
    }
    return `${baseClass} text-neutral-500 hover:text-neutral-900 hover:bg-neutral-150 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/60`;
  };

  return (
    <div className="flex items-center gap-2.5 bg-surface border border-border-custom hover:border-neutral-400 dark:hover:border-neutral-700 px-3.5 py-1.5 rounded-full shadow-lg transition-all duration-200 max-w-full overflow-x-auto no-scrollbar">
      
      {/* 1. Settings (if Owner/Admin) */}
      {!isClient && (role === "OWNER" || role === "ADMIN") && (
        <Link
          href="/dashboard/settings"
          className={getLinkClass(isActive("/dashboard/settings", true))}
        >
          <Settings size={13} />
          <span className="hidden sm:inline">Settings</span>
        </Link>
      )}

      {/* Ask AI (super_admin only) */}
      {role === "super_admin" && (
        <Link
          href="/dashboard/ask-ai"
          className={getLinkClass(
            isActive("/dashboard/ask-ai", true), 
            "text-indigo-600 dark:text-indigo-400"
          )}
        >
          <Sparkles size={13} className={isActive("/dashboard/ask-ai", true) ? "" : "text-indigo-500 animate-pulse"} />
          <span className="hidden sm:inline">Ask AI</span>
        </Link>
      )}

      {/* 2. Projects */}
      <Link
        href="/dashboard/projects"
        className={getLinkClass(isActive("/dashboard/projects"))}
      >
        <Folder size={13} />
        <span className="hidden sm:inline">Projects</span>
      </Link>

      {/* Everything */}
      <Link
        href="/dashboard/everything"
        className={getLinkClass(isActive("/dashboard/everything", true))}
      >
        <Compass size={13} />
        <span className="hidden sm:inline">Everything</span>
      </Link>

      {/* 3. Today */}
      <Link
        href="/dashboard"
        className={getLinkClass(isActive("/dashboard", true))}
      >
        <Home size={13} className={isActive("/dashboard", true) ? "" : "text-brand-accent"} />
        <span className="hidden sm:inline">Today</span>
      </Link>

      {/* Calendar */}
      <Link
        href="/dashboard/calendar"
        className={getLinkClass(isActive("/dashboard/calendar", true))}
      >
        <CalendarIcon size={13} />
        <span className="hidden sm:inline">Calendar</span>
      </Link>

      {!isClient && (
        <>
          {/* 4. Conversations */}
          <Link
            href="/dashboard/dm"
            className={getLinkClass(isActive("/dashboard/dm"))}
          >
            <MessageSquare size={13} />
            <span className="hidden sm:inline">Conversations</span>
          </Link>

          {/* Reports */}
          <Link
            href="/dashboard/reports"
            className={getLinkClass(isActive("/dashboard/reports", true))}
          >
            <LineChart size={13} />
            <span className="hidden sm:inline">Reports</span>
          </Link>
        </>
      )}

      <span className="w-px h-4 bg-neutral-350 dark:bg-neutral-800 shrink-0 self-center" />

      {/* 5. Theme Toggle */}
      <div className="flex items-center shrink-0">
        <ThemeToggle initialTheme={theme} />
      </div>

      <span className="w-px h-4 bg-neutral-350 dark:bg-neutral-800 shrink-0 self-center" />

      {/* 6. Profile Avatar at the end */}
      <Link
        href="/dashboard/profile"
        className={`flex items-center gap-1.5 pl-1.5 pr-3.5 py-1.5 rounded-full transition-all duration-200 shrink-0 select-none ${
          isActive("/dashboard/profile", true)
            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-extrabold shadow-sm"
            : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-150 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/60"
        }`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={userName}
            className="w-5 h-5 rounded-full bg-neutral-200 shrink-0 border border-border-custom"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 border border-border-custom">
            <User size={10} className="text-neutral-500" />
          </div>
        )}
        <span className="text-[11px] font-bold uppercase tracking-wider hidden md:inline">
          Profile
        </span>
      </Link>
    </div>
  );
}
