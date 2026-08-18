import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import NavigationSidebar from "@/components/navigation-sidebar";
import PageTransition from "@/components/page-transition";
import ContextChatDrawer from "@/components/context-chat-drawer";
import ThemeToggle from "@/components/theme-toggle";

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
  const colorBg = cookieStore.get("streamlyned_color")?.value || "";

  // Fetch latest DM message timestamps for the unread dot in nav (non-clients only)
  let dmChatInfo: { dmGroupId: string; latestMessageAt: string | null }[] = [];
  if (session.role !== "CLIENT") {
    const dmGroups = await db.dmGroup.findMany({
      where: {
        workspaceId: session.workspace.id,
        members: { some: { userId: session.user.id } },
      },
      select: {
        id: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    dmChatInfo = dmGroups.map((g) => ({
      dmGroupId: g.id,
      latestMessageAt: g.messages[0]?.createdAt.toISOString() ?? null,
    }));
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Collapsible Left Sidebar */}
      <NavigationSidebar
        role={session.role}
        avatarUrl={session.user.avatarUrl}
        userName={session.user.name}
        theme={theme}
        colorBg={colorBg}
        userId={session.user.id}
        dmChatInfo={dmChatInfo}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header (Color switching on the top right) */}
        <header className="h-14 bg-surface border-b border-border-custom px-4 md:px-8 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-1.5 md:hidden">
            <span className="text-sm font-semibold tracking-tight text-neutral-800 dark:text-neutral-200">
              Streamlyned
            </span>
            <span className="text-[7px] text-neutral-450 dark:text-neutral-500 font-medium">
              developed by Scaling Dynamics
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle initialTheme={theme} initialColor={colorBg} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8 pb-24 md:pb-8 min-w-0">
          <div className="max-w-5xl mx-auto min-h-full flex flex-col">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>
      </div>

      <ContextChatDrawer />
    </div>
  );
}
