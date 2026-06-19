import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import EverythingDashboardView from "@/components/everything-dashboard-view";

export default async function EverythingPage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  // 1. Fetch all projects in the workspace the user belongs to
  const projects = await db.project.findMany({
    where: {
      workspaceId: session.workspace.id,
      deletedAt: null,
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const projectIds = projects.map((p) => p.id);

  // 2, 3 & 4. Fetch comments, docs, and task attachments in parallel
  const [comments, docs, taskAttachments] = await Promise.all([
    db.comment.findMany({
      where: {
        workspaceId: session.workspace.id,
        OR: [
          {
            task: {
              projectId: { in: projectIds },
              ...(session.role === "CLIENT" ? { visibleToClients: true } : {}),
            },
          },
          {
            discussion: {
              projectId: { in: projectIds },
              ...(session.role === "CLIENT" ? { visibleToClients: true } : {}),
            },
          },
          {
            doc: {
              projectId: { in: projectIds },
              ...(session.role === "CLIENT" ? { visibleToClients: true } : {}),
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
        discussion: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
        doc: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.doc.findMany({
      where: {
        projectId: { in: projectIds },
        ...(session.role === "CLIENT" ? { visibleToClients: true } : {}),
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        projectId: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.taskAttachment.findMany({
      where: {
        task: {
          projectId: { in: projectIds },
          ...(session.role === "CLIENT" ? { visibleToClients: true } : {}),
        },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Format dates for props safety
  const formattedComments = comments.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    isClientComment: c.isClientComment,
    user: c.user,
    parentType: (c.taskId ? "TASK" : c.discussionId ? "DISCUSSION" : "DOC") as "TASK" | "DISCUSSION" | "DOC",
    parentName: c.task?.title || c.discussion?.title || c.doc?.title || "Deleted Item",
    parentId: c.taskId || c.discussionId || c.docId || "",
    projectId: c.task?.projectId || c.discussion?.projectId || c.doc?.projectId || "",
  }));

  const formattedDocs = docs.map((d) => ({
    id: d.id,
    title: d.title,
    updatedAt: d.updatedAt.toISOString(),
    projectId: d.projectId,
  }));

  const formattedAttachments = taskAttachments.map((a) => ({
    id: a.id,
    fileName: a.fileName,
    fileUrl: a.fileUrl,
    fileSize: a.fileSize,
    createdAt: a.createdAt.toISOString(),
    taskName: a.task.title,
    taskId: a.task.id,
    projectId: a.task.projectId,
  }));

  const formattedProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  return (
    <div className="flex-1 flex flex-col space-y-6 min-h-0">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
          Everything Feed
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Unified workspace-wide feed of files, comment streams, and project answers.
        </p>
      </div>

      <EverythingDashboardView
        projects={formattedProjects}
        comments={formattedComments}
        docs={formattedDocs}
        attachments={formattedAttachments}
        isClient={session.role === "CLIENT"}
      />
    </div>
  );
}
