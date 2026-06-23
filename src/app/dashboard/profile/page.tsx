import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ProfileView from "@/components/profile-view";
import { STORAGE_LIMIT_BYTES } from "@/lib/storage-quota";

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

  // Surface the Google photo as a selectable option if the stored avatar is from Google.
  // This covers the common case (new signup) without needing a separate DB column.
  const googleAvatarUrl =
    session.user.avatarUrl?.includes("googleusercontent.com")
      ? session.user.avatarUrl
      : null;

  let storageUsedBytes = 0;
  try {
    const [userRecord] = await db.$queryRaw<{ storageUsedBytes: bigint }[]>`
      SELECT "storageUsedBytes" FROM "User" WHERE id = ${session.user.id}
    `;
    storageUsedBytes = Number(userRecord?.storageUsedBytes ?? 0);
  } catch {
    // Column not yet migrated — shows 0 until migration runs
  }

  return (
    <ProfileView
      currentUser={session.user}
      googleAvatarUrl={googleAvatarUrl}
      storageUsedBytes={storageUsedBytes}
      storageLimitBytes={STORAGE_LIMIT_BYTES}
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
