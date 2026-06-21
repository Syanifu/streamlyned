import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
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
    <div className="flex flex-col h-screen bg-background overflow-hidden font-sans">
      {/* Top Nav Header */}
      <header className="h-14 md:h-16 bg-background flex items-center px-4 md:px-8 shrink-0 z-10 border-b border-border-custom md:border-0">
        {/* Wordmark */}
        <div className="flex items-center shrink-0">
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 tracking-tight">
            Streamlyned
          </span>
        </div>

        {/* Navigation — centered on desktop, hidden on mobile (bottom nav handles it) */}
        <div className="flex-1 flex justify-center">
          <NavigationCapsule
            role={session.role}
            avatarUrl={session.user.avatarUrl}
            userName={session.user.name}
            theme={theme}
            colorBg={colorBg}
            userId={session.user.id}
            dmChatInfo={dmChatInfo}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
