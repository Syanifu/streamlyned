import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ReportsDashboardView from "@/components/reports-dashboard-view";

export default async function ReportsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  // Enforce role check: Clients cannot see reports
  if (session.role === "CLIENT") {
    redirect("/dashboard");
  }

  // 1. Fetch all projects in the workspace (excluding deleted ones)
  const projects = await db.project.findMany({
    where: {
      workspaceId: session.workspace.id,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      startDate: true,
      endDate: true,
      isArchived: true,
    },
  });

  const projectIds = projects.map((p) => p.id);

  // 2. Fetch all workspace members/users
  const workspaceUsers = await db.user.findMany({
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

  // 3. Fetch all tasks in the workspace
  const tasks = await db.task.findMany({
    where: {
      projectId: { in: projectIds },
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      dueDateEnd: true,
      createdAt: true,
      completedAt: true,
      projectId: true,
      priority: true,
      assignees: {
        select: {
          userId: true,
        },
      },
    },
  });

  // Format dates for props compatibility
  const formattedProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    startDate: p.startDate ? p.startDate.toISOString() : null,
    endDate: p.endDate ? p.endDate.toISOString() : null,
    isArchived: p.isArchived,
  }));

  const formattedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    isCompleted: t.isCompleted,
    dueDateEnd: t.dueDateEnd ? t.dueDateEnd.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    projectId: t.projectId,
    assigneeIds: t.assignees.map((a) => a.userId),
    priority: t.priority,
  }));

  return (
    <div className="flex-1 flex flex-col space-y-6 min-h-0">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
          Mission Control & Reports
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Review project timelines, monitor work health, and track resource assignments.
        </p>
      </div>

      <ReportsDashboardView
        projects={formattedProjects}
        users={workspaceUsers}
        tasks={formattedTasks}
      />
    </div>
  );
}
