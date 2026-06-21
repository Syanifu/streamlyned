import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import GlobalCalendarView from "@/components/global-calendar-view";
import GoogleCalendarButton from "@/components/google-calendar-button";

export default async function GlobalCalendarPage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  // 1. Fetch all projects the user is a member of in this workspace
  const projects = await db.project.findMany({
    where: {
      workspaceId: session.workspace.id,
      deletedAt: null,
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const projectIds = projects.map((p) => p.id);

  const googleToken = await db.googleCalendarToken.findUnique({
    where: { userId: session.user.id },
    select: { syncedAt: true },
  });

  const [events, tasks] = await Promise.all([
    db.calendarEvent.findMany({
      where: {
        projectId: { in: projectIds },
      },
      select: {
        id: true,
        title: true,
        description: true,
        startAt: true,
        endAt: true,
        recurrence: true,
        location: true,
        videoCallLink: true,
        projectId: true,
        priority: true,
        source: true,
        sourceRef: true,
        progressPct: true,
      },
      orderBy: { startAt: "asc" },
    }),
    db.task.findMany({
      where: {
        projectId: { in: projectIds },
        dueDateEnd: { not: null },
        isCompleted: false,
        ...(session.role === "CLIENT" ? { visibleToClients: true } : {}), // Filter private tasks for clients
      },
      select: {
        id: true,
        title: true,
        dueDateEnd: true,
        projectId: true,
        priority: true,
      },
      orderBy: { dueDateEnd: "asc" },
    }),
  ]);

  // Re-map items to pass ISO string dates
  const formattedEvents = events.map((e) => ({
    ...e,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt.toISOString(),
  }));

  const formattedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    dueDateEnd: t.dueDateEnd!.toISOString(),
    projectId: t.projectId,
    priority: t.priority,
  }));

  return (
    <div className="flex-1 flex flex-col space-y-6 min-h-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
            Workspace Calendar
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Aggregated view of all deadlines, meetings, and events across your active projects.
          </p>
        </div>
        <div className="shrink-0 pt-0.5">
          <GoogleCalendarButton
            isConnected={!!googleToken}
            syncedAt={googleToken?.syncedAt?.toISOString() ?? null}
          />
        </div>
      </div>

      <GlobalCalendarView
        projects={projects}
        events={formattedEvents}
        tasks={formattedTasks}
        currentUserId={session.user.id}
        workspaceSlug={session.workspace.slug}
      />
    </div>
  );
}
