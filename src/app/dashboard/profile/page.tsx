import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ProfileView from "@/components/profile-view";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  const [googleConn, notionConn, airtableConn, obsidianConn, evernoteConn] = await Promise.all([
    db.connection.findFirst({
      where: { provider: "google", userId: session.user.id, status: "active" },
    }),
    db.connection.findFirst({
      where: { provider: "notion", workspaceId: session.workspace.id, status: "active" },
    }),
    db.connection.findFirst({
      where: { provider: "airtable", workspaceId: session.workspace.id, status: "active" },
    }),
    db.connection.findFirst({
      where: { provider: "obsidian", userId: session.user.id, status: "active" },
    }),
    db.connection.findFirst({
      where: { provider: "evernote", userId: session.user.id, status: "active" },
    }),
  ]);

  return (
    <ProfileView
      currentUser={session.user}
      role={session.role}
      workspaceName={session.workspace.name}
      integrations={{
        google: {
          connected: !!googleConn,
          accountName: googleConn?.externalAccountName ?? null,
          lastSyncedAt: googleConn?.lastSyncedAt?.toISOString() ?? null,
        },
        notion: {
          connected: !!notionConn,
          accountName: notionConn?.externalAccountName ?? null,
          lastSyncedAt: notionConn?.lastSyncedAt?.toISOString() ?? null,
        },
        airtable: {
          connected: !!airtableConn,
          accountName: airtableConn?.externalAccountName ?? null,
          lastSyncedAt: airtableConn?.lastSyncedAt?.toISOString() ?? null,
        },
        obsidian: {
          connected: !!obsidianConn,
          accountName: obsidianConn?.externalAccountName ?? null,
          lastSyncedAt: obsidianConn?.lastSyncedAt?.toISOString() ?? null,
        },
        evernote: {
          connected: !!evernoteConn,
          accountName: evernoteConn?.externalAccountName ?? null,
          lastSyncedAt: evernoteConn?.lastSyncedAt?.toISOString() ?? null,
        },
      }}
    />
  );
}
