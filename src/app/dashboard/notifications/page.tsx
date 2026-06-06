import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import NotificationsView from "@/components/notifications-view";

export default async function NotificationsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  // Fetch all notifications for this user in this workspace
  const notifications = await db.notification.findMany({
    where: {
      userId: session.user.id,
      workspaceId: session.workspace.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <NotificationsView notifications={notifications} />
  );
}
