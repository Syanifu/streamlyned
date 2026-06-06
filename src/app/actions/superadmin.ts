"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { aiGateway } from "@/lib/ai/gateway";

export async function askSuperAdminAiAction(query: string) {
  try {
    const session = await requireSession();

    if (session.role !== "super_admin") {
      throw new Error("Access Denied: Only super admins can access the business intelligence assistant.");
    }

    // 1. Fetch live workspace metrics
    const projects = await db.project.findMany({
      where: {
        workspaceId: session.workspace.id,
        deletedAt: null,
      },
      include: {
        taskLists: {
          include: {
            tasks: {
              where: {
                isCompleted: false,
                dueDateEnd: { lt: new Date() },
              },
            },
          },
        },
      },
    });

    const projectIds = projects.map((p) => p.id);

    // 2. Fetch team members
    const members = await db.workspaceMember.findMany({
      where: {
        workspaceId: session.workspace.id,
      },
      include: {
        user: true,
      },
    });

    // 3. Compute overdue tasks count
    const overdueCount = await db.task.count({
      where: {
        projectId: { in: projectIds },
        isCompleted: false,
        dueDateEnd: { lt: new Date() },
      },
    });

    // 4. Fetch P1 & P2 tasks
    const highPriorityTasks = await db.task.findMany({
      where: {
        projectId: { in: projectIds },
        isCompleted: false,
        priority: { in: ["P1", "P2"] },
      },
      include: {
        taskList: {
          include: {
            project: true,
          },
        },
      },
      orderBy: { priority: "asc" },
    });

    // 5. Fetch upcoming/active P1 & P2 events
    const highPriorityEvents = await db.calendarEvent.findMany({
      where: {
        projectId: { in: projectIds },
        priority: { in: ["P1", "P2"] },
        startAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: {
        project: true,
      },
      orderBy: { startAt: "asc" },
    });

    const highPriorityTasksText = highPriorityTasks
      .map((t) => `- [${t.priority}] Task: "${t.title}" in Project "${t.taskList.project.name}" (Due: ${t.dueDateEnd ? t.dueDateEnd.toDateString() : "No due date"})`)
      .join("\n");

    const highPriorityEventsText = highPriorityEvents
      .map((e) => `- [${e.priority}] Event: "${e.title}" in Project "${e.project.name}" scheduled for ${e.startAt.toLocaleString()}`)
      .join("\n");

    // 6. Construct live system prompt context
    const activeProjectsText = projects
      .map((p) => {
        const overdueTasksInProject = p.taskLists.flatMap((l) => l.tasks).length;
        const status = p.isArchived 
          ? "Archived" 
          : overdueTasksInProject > 0 
          ? "At Risk" 
          : "Healthy";
        return `${p.name} - ${status}`;
      })
      .join(", ");

    const membersText = members
      .map((m) => `${m.user.name} (${m.role})`)
      .join(", ");

    const systemPrompt = `
You are the business intelligence assistant for ${session.workspace.name}.
Active projects: ${activeProjectsText}
Team members: ${membersText}
Overdue tasks: ${overdueCount}
Today's date: ${new Date().toDateString()}

CRITICAL SENSITIVE PRIORITY DATA (Surface P1 and P2 items first when user asks "what needs attention today?"):
High priority tasks (P1 & P2):
${highPriorityTasksText || "None active"}

High priority events (P1 & P2):
${highPriorityEventsText || "None scheduled"}

Answer questions as a concise ops lead would. Be direct and precise.
`;

    // 5. Query AI completion
    const aiPrompt = `System Context:
${systemPrompt}

User Inquiry: "${query}"

Please provide a direct, concise response based ONLY on the context provided above.`;

    const response = await aiGateway.complete(session.workspace.id, aiPrompt);
    return { success: true, answer: response.text };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
