import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import NavigationCapsule from "@/components/navigation-capsule";
import PageTransition from "@/components/page-transition";
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

  // Fetch projects and unread notifications count in parallel
  const [projects, unreadNotificationsCount] = await Promise.all([
    db.project.findMany({
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
    }),
    db.notification.count({
      where: {
        workspaceId: session.workspace.id,
        userId: session.user.id,
        isRead: false,
        isSuppressed: false,
      },
    })
  ]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden font-sans">
      {/* Top Nav Header - compact unified menu bar */}
      <header className="h-16 bg-background flex items-center justify-center px-8 shrink-0 z-10">
        <NavigationCapsule
          role={session.role}
          avatarUrl={session.user.avatarUrl}
          userName={session.user.name}
          theme={theme}
        />
      </header>

      {/* Main Content Area & Bottom Chat docked */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto bg-background p-8 pb-28 min-w-0">
          <div className="max-w-5xl mx-auto min-h-full flex flex-col">
            <PageTransition>
              {children}
            </PageTransition>
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
