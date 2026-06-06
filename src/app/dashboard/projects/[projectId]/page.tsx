import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ProjectHeader from "@/components/project/project-header";
import TasksTab from "@/components/project/tasks-tab";
import DiscussionsTab from "@/components/project/discussions-tab";
import ChatTab from "@/components/project/chat-tab";
import DocsTab from "@/components/project/docs-tab";
import CalendarTab from "@/components/project/calendar-tab";
import CheckinsTab from "@/components/project/checkins-tab";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    tab?: string;
    task?: string; // Selected task ID for details drawer
    id?: string;   // Selected discussion or doc ID
  }>;
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  const { projectId } = await params;
  const { tab = "tasks", task: selectedTaskId, id: selectedId } = await searchParams;

  // 1. Fetch project with workspace validation (multi-tenant isolation)
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      workspaceId: session.workspace.id,
      deletedAt: null,
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!project) {
    redirect("/dashboard");
  }

  // 2. Fetch current user's membership and allowed tools (enforce revocation check)
  const currentMember = project.members.find((m) => m.userId === session.user.id);
  if (!currentMember) {
    redirect("/dashboard");
  }

  const parsedTools = JSON.parse(project.tools) as string[];
  const enabledProjectTools = parsedTools.includes("checkins") ? parsedTools : [...parsedTools, "checkins"];
  const allowedTools = session.role === "CLIENT"
    ? (JSON.parse(currentMember.visibleTools) as string[]).filter(t => enabledProjectTools.includes(t))
    : enabledProjectTools;

  // 3. Security Check: If user manually changes URL to access forbidden tab, block them
  if (!allowedTools.includes(tab)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
          Access Denied
        </h3>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm">
          This section is not enabled for your account or this project.
        </p>
      </div>
    );
  }

  // Fetch all workspace users to pass down for assignees and @mentions
  const allWorkspaceUsers = await db.user.findMany({
    where: {
      memberships: {
        some: {
          workspaceId: session.workspace.id,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  });

  // Query specific data for the Tasks Tab
  let lists: any[] = [];
  let selectedTaskDetails: any = null;
  let taskHistory: any[] = [];

  if (tab === "tasks") {
    // Query lists and tasks
    lists = await db.taskList.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      include: {
        tasks: {
          where: session.role === "CLIENT" ? { visibleToClients: true } : {},
          orderBy: { position: "asc" },
          include: {
            assignees: {
              include: {
                user: true,
              },
            },
            comments: true,
          },
        },
      },
    });

    if (selectedTaskId) {
      selectedTaskDetails = await db.task.findFirst({
        where: { 
          id: selectedTaskId, 
          projectId,
          ...(session.role === "CLIENT" ? { visibleToClients: true } : {}),
        },
        include: {
          assignees: {
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
          },
          comments: {
            orderBy: { createdAt: "desc" },
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
          },
        },
      });

      if (selectedTaskDetails) {
        taskHistory = await db.auditLog.findMany({
          where: {
            workspaceId: session.workspace.id,
            projectId,
            entityType: "TASK",
            entityId: selectedTaskId,
          },
          orderBy: { createdAt: "desc" },
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
        });
      }
    }
  }

  // Query checkin questions and answers
  let checkInQuestions: any[] = [];
  if (tab === "checkins") {
    checkInQuestions = await db.checkInQuestion.findMany({
      where: {
        projectId,
        workspaceId: session.workspace.id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        answers: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  return (
    <div className="flex-1 flex flex-col space-y-6 min-h-0">
      {/* Project title and tab navigation */}
      <ProjectHeader
        projectName={project.name}
        projectDescription={project.description}
        activeTab={tab}
        allowedTools={allowedTools}
        projectId={projectId}
        isArchived={project.isArchived}
      />

      {/* Dynamic Tab Body */}
      <div className="flex-1 flex flex-col min-h-0">
        {tab === "tasks" && (
          <TasksTab
            projectId={projectId}
            selectedTaskId={selectedTaskId}
            workspaceUsers={allWorkspaceUsers}
            currentUser={session.user}
            isClient={session.role === "CLIENT"}
            lists={lists}
            selectedTaskDetails={selectedTaskDetails}
            taskHistory={taskHistory}
          />
        )}
        {tab === "discussions" && (
          <DiscussionsTab
            projectId={projectId}
            selectedId={selectedId}
            currentUser={session.user}
            isClient={session.role === "CLIENT"}
          />
        )}
        {tab === "chat" && (
          <ChatTab
            projectId={projectId}
            currentUser={session.user}
            isClient={session.role === "CLIENT"}
          />
        )}
        {tab === "docs" && (
          <DocsTab
            projectId={projectId}
            selectedId={selectedId}
            currentUser={session.user}
            isClient={session.role === "CLIENT"}
          />
        )}
        {tab === "calendar" && (
          <CalendarTab
            projectId={projectId}
            currentUser={session.user}
            isClient={session.role === "CLIENT"}
          />
        )}
        {tab === "checkins" && (
          <CheckinsTab
            projectId={projectId}
            currentUser={session.user}
            isClient={session.role === "CLIENT"}
            questions={checkInQuestions}
          />
        )}
      </div>
    </div>
  );
}
