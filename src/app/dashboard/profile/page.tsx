import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ProfileView from "@/components/profile-view";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  const [googleToken, notionConnection] = await Promise.all([
    db.googleCalendarToken.findUnique({ where: { userId: session.user.id } }),
    db.notionConnection.findUnique({ where: { workspaceId: session.workspace.id } }),
  ]);

  return (
    <ProfileView
      currentUser={session.user}
      role={session.role}
      workspaceName={session.workspace.name}
      googleCalendarConnected={!!googleToken}
      googleCalendarSyncedAt={googleToken?.syncedAt?.toISOString() ?? null}
      notionConnected={!!notionConnection}
      notionWorkspaceName={notionConnection?.notionWorkspaceName ?? null}
    />
  );
}
