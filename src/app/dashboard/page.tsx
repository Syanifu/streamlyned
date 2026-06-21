import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTodayViewData } from "@/lib/today-rules";
import TodayView from "@/components/today-view";
import { db } from "@/lib/db";

export default async function DashboardTodayPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const items = await getTodayViewData(session.user.id, session.workspace.id);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    events,
    recentDmGroups,
    recentProjectChatMessages,
    deadlineProjects,
    unreadNotifications,
  ] = await Promise.all([
    // Today's calendar events
    db.calendarEvent.findMany({
      where: {
        workspaceId: session.workspace.id,
        startAt: { gte: startOfToday, lte: endOfToday },
        project: {
          members: { some: { userId: session.user.id } },
          deletedAt: null,
        },
      },
      orderBy: { startAt: "asc" },
      include: {
        project: { select: { id: true, name: true } },
        attendees: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
    }),

    // DM groups with recent messages from others (last 48h)
    db.dmGroup.findMany({
      where: {
        workspaceId: session.workspace.id,
        members: { some: { userId: session.user.id } },
        messages: {
          some: { createdAt: { gte: last48h }, userId: { not: session.user.id } },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true } } } },
        messages: {
          where: { createdAt: { gte: last48h }, userId: { not: session.user.id } },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { user: { select: { id: true, name: true } } },
        },
      },
    }),

    // Latest project chat message per project from others (last 24h)
    db.chatMessage.findMany({
      where: {
        workspaceId: session.workspace.id,
        projectId: { not: null },
        userId: { not: session.user.id },
        createdAt: { gte: last24h },
        project: { members: { some: { userId: session.user.id } }, deletedAt: null },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    }),

    // Projects with deadline in next 7 days
    db.project.findMany({
      where: {
        workspaceId: session.workspace.id,
        deletedAt: null,
        isArchived: false,
        endDate: { gte: now, lte: in7days },
        members: { some: { userId: session.user.id } },
      },
      select: { id: true, name: true, endDate: true, description: true },
      orderBy: { endDate: "asc" },
    }),

    // Unread notifications (most recent 10)
    db.notification.findMany({
      where: {
        workspaceId: session.workspace.id,
        userId: session.user.id,
        isRead: false,
        isSuppressed: false,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        targetUrl: true,
        createdAt: true,
        priority: true,
      },
    }),
  ]);

  // Deduplicate project chats — one per project, latest message wins
  const seenProjectIds = new Set<string>();
  const dedupedProjectChats = recentProjectChatMessages.filter((m) => {
    if (!m.projectId || seenProjectIds.has(m.projectId)) return false;
    seenProjectIds.add(m.projectId);
    return true;
  });

  const serializedEvents = events.map((e) => ({
    ...e,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt.toISOString(),
    createdAt: e.createdAt.toISOString(),
    attendees: e.attendees.map((a) => ({
      userId: a.userId,
      name: a.user.name,
      avatarUrl: a.user.avatarUrl,
    })),
  }));

  const serializedDms = recentDmGroups.map((g) => ({
    id: g.id,
    members: g.members.map((m) => ({ userId: m.userId, name: m.user.name })),
    latestMessage: g.messages[0]
      ? {
          content: g.messages[0].content,
          senderName: g.messages[0].user.name,
          createdAt: g.messages[0].createdAt.toISOString(),
        }
      : null,
  }));

  const serializedProjectChats = dedupedProjectChats.map((m) => ({
    id: m.id,
    projectId: m.projectId!,
    projectName: m.project?.name ?? "",
    senderName: m.user.name,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));

  const serializedDeadlines = deadlineProjects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    endDate: p.endDate!.toISOString(),
  }));

  const serializedNotifications = unreadNotifications.map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <TodayView
      initialItems={items}
      userName={session.user.name}
      currentUserId={session.user.id}
      events={serializedEvents}
      recentDms={serializedDms}
      recentProjectChats={serializedProjectChats}
      deadlineProjects={serializedDeadlines}
      notifications={serializedNotifications}
    />
  );
}
