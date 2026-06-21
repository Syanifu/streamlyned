import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import SettingsView from "@/components/settings-view";

export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  if (session.role !== "OWNER" && session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [members, notionConnection] = await Promise.all([
    db.workspaceMember.findMany({
      where: { workspaceId: session.workspace.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { role: "asc" },
    }),
    db.notionConnection.findUnique({ where: { workspaceId: session.workspace.id } }),
  ]);

  return (
    <SettingsView
      members={members}
      currentUserId={session.user.id}
      currentUserRole={session.role}
      notionConnected={!!notionConnection}
      notionWorkspaceName={notionConnection?.notionWorkspaceName ?? null}
    />
  );
}
