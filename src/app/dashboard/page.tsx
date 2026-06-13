import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTodayViewData } from "@/lib/today-rules";
import TodayView from "@/components/today-view";
import { db } from "@/lib/db";

export default async function DashboardTodayPage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  // Fetch today view data for the current user in this workspace
  const items = await getTodayViewData(session.user.id, session.workspace.id);

  // Fetch today's calendar events
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const events = await db.calendarEvent.findMany({
    where: {
      workspaceId: session.workspace.id,
      startAt: {
        gte: startOfToday,
        lte: endOfToday,
      },
      project: {
        agenticEnabled: true,
      },
    },
    orderBy: { startAt: "asc" },
    include: {
      project: true,
    },
  });

  const serializedEvents = events.map((e) => ({
    ...e,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt.toISOString(),
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <TodayView 
      initialItems={items} 
      userName={session.user.name} 
      events={serializedEvents}
    />
  );
}
