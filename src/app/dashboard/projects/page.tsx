import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ProjectListView from "@/components/project-list-view";

export default async function ProjectsIndexPage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  const isClient = session.role === "CLIENT";

  // Fetch active projects that the user belongs to
  const projects = await db.project.findMany({
    where: {
      workspaceId: session.workspace.id,
      isArchived: false,
      deletedAt: null,
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
      chatMessages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  const projectChatInfo = projects.map((p) => ({
    projectId: p.id,
    latestMessageAt: p.chatMessages[0]?.createdAt.toISOString() ?? null,
  }));

  return (
    <ProjectListView
      projects={projects}
      workspaceName={session.workspace.name}
      isClient={isClient}
      currentUserId={session.user.id}
      projectChatInfo={projectChatInfo}
    />
  );
}
