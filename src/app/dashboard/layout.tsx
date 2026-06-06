import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { 
  Home, 
  Folder, 
  MessageSquare, 
  Bell, 
  Settings, 
  LogOut, 
  Search, 
  User,
  Compass,
  Calendar as CalendarIcon,
  LineChart,
  Sparkles
} from "lucide-react";
import SearchInput from "@/components/search-input";
import { cookies } from "next/headers";
import ThemeToggle from "@/components/theme-toggle";
import ContextChatDrawer from "@/components/context-chat-drawer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const theme = cookieStore.get("streamlyned_theme")?.value === "dark" ? "dark" : "light";

  const isClient = session.role === "CLIENT";

  // Fetch active projects that the user belongs to
  const projects = await db.project.findMany({
    where: {
      workspaceId: session.workspace.id,
      isArchived: false,
      deletedAt: null,
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Fetch unread notification count
  const unreadNotificationsCount = await db.notification.count({
    where: {
      workspaceId: session.workspace.id,
      userId: session.user.id,
      isRead: false,
      isSuppressed: false,
    },
  });

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden font-sans">
      {/* Top Nav Header - compact unified menu bar */}
      <header className="h-16 bg-background flex items-center justify-center px-8 shrink-0 z-10">
        <div className="flex items-center gap-5 bg-surface border border-border-custom hover:border-neutral-400 dark:hover:border-neutral-700 px-5 py-2 rounded-full shadow-lg transition-all duration-200">
          
          {/* 1. Settings (if Owner/Admin) */}
          {!isClient && (session.role === "OWNER" || session.role === "ADMIN") && (
            <>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-foreground dark:text-neutral-400 dark:hover:text-white uppercase tracking-wider transition-colors"
              >
                <Settings size={13} />
                <span>Settings</span>
              </Link>
              <span className="w-px h-3 bg-neutral-300 dark:bg-neutral-700" />
            </>
          )}

          {/* Ask AI (super_admin only) */}
          {session.role === "super_admin" && (
            <>
              <Link
                href="/dashboard/ask-ai"
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 uppercase tracking-wider transition-colors"
              >
                <Sparkles size={13} className="text-indigo-500 animate-pulse" />
                <span>Ask AI</span>
              </Link>
              <span className="w-px h-3 bg-neutral-300 dark:bg-neutral-700" />
            </>
          )}

          {/* 2. Projects */}
          <Link
            href="/dashboard/projects"
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-foreground dark:text-neutral-400 dark:hover:text-white uppercase tracking-wider transition-colors"
          >
            <Folder size={13} />
            <span>Projects</span>
          </Link>

          <span className="w-px h-3 bg-neutral-300 dark:bg-neutral-700" />

          {/* Everything */}
          <Link
            href="/dashboard/everything"
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-foreground dark:text-neutral-400 dark:hover:text-white uppercase tracking-wider transition-colors"
          >
            <Compass size={13} />
            <span>Everything</span>
          </Link>

          <span className="w-px h-3 bg-neutral-300 dark:bg-neutral-700" />

          {/* 3. Today */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-extrabold text-neutral-700 hover:text-foreground dark:text-neutral-300 dark:hover:text-white uppercase tracking-wider transition-colors"
          >
            <Home size={13} className="text-brand-accent" />
            <span>Today</span>
          </Link>

          <span className="w-px h-3 bg-neutral-300 dark:bg-neutral-700" />

          {/* Calendar */}
          <Link
            href="/dashboard/calendar"
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-foreground dark:text-neutral-400 dark:hover:text-white uppercase tracking-wider transition-colors"
          >
            <CalendarIcon size={13} />
            <span>Calendar</span>
          </Link>

          {!isClient && (
            <>
              <span className="w-px h-3 bg-neutral-300 dark:bg-neutral-700" />
              {/* 4. Conversations */}
              <Link
                href="/dashboard/dm"
                className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-foreground dark:text-neutral-400 dark:hover:text-white uppercase tracking-wider transition-colors"
              >
                <MessageSquare size={13} />
                <span>Conversations</span>
              </Link>

              <span className="w-px h-3 bg-neutral-300 dark:bg-neutral-700" />
              {/* Reports */}
              <Link
                href="/dashboard/reports"
                className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-foreground dark:text-neutral-400 dark:hover:text-white uppercase tracking-wider transition-colors"
              >
                <LineChart size={13} />
                <span>Reports</span>
              </Link>
            </>
          )}

          <span className="w-px h-3 bg-neutral-300 dark:bg-neutral-700" />

          {/* 5. Theme Toggle */}
          <div className="flex items-center">
            <ThemeToggle initialTheme={theme} />
          </div>

          <span className="w-px h-3 bg-neutral-300 dark:bg-neutral-700" />

          {/* 6. Profile Avatar at the end */}
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2"
          >
            {session.user.avatarUrl ? (
              <img
                src={session.user.avatarUrl}
                alt={session.user.name}
                className="w-7 h-7 rounded-full bg-neutral-200 shrink-0 border border-border-custom"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 border border-border-custom">
                <User size={13} className="text-neutral-500" />
              </div>
            )}
            <span className="text-xs font-bold text-neutral-500 hover:text-foreground dark:text-neutral-450 dark:hover:text-white uppercase tracking-wider transition-colors hidden sm:inline">
              Profile
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content Area & Bottom Chat docked */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto bg-background p-8 pb-28 min-w-0">
          <div className="max-w-5xl mx-auto min-h-full flex flex-col">
            {children}
          </div>
        </main>

        {/* Sticky Bottom Chat Input Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-8 pb-6 px-8 flex justify-center pointer-events-none z-10">
          <div className="max-w-2xl w-full pointer-events-auto">
            <ContextChatDrawer />
          </div>
        </div>
      </div>
    </div>
  );
}
