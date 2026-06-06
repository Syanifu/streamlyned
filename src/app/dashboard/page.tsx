import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTodayViewData } from "@/lib/today-rules";
import TodayView from "@/components/today-view";

export default async function DashboardTodayPage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  // Fetch today view data for the current user in this workspace
  const items = await getTodayViewData(session.user.id, session.workspace.id);

  return (
    <TodayView 
      initialItems={items} 
      userName={session.user.name} 
    />
  );
}
