import { db } from "@/lib/db";

export async function syncProjectProgress(projectId: string) {
  // 1. Fetch project with agentic features enabled and end date
  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return { success: false, reason: "Project not found" };
  }

  if (!project.agenticEnabled) {
    return { success: false, reason: "Agentic features disabled for this project" };
  }

  if (!project.endDate) {
    return { success: false, reason: "Project has no set end date" };
  }

  // 2. Fetch todos
  const todos = await db.task.findMany({
    where: { projectId: project.id },
  });

  const total = todos.length;
  const done = todos.filter((t) => t.isCompleted).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  // 3. Determine archiving
  // "Do not delete the event — keep it visible for 7 days after the end date, then archive it."
  const sevenDaysPostEnd = new Date(project.endDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const isArchivedMode = pct === 100 && new Date() > sevenDaysPostEnd;
  const priorityVal = isArchivedMode ? "P6" : "P4";

  // 4. Find if there is an existing event
  const existingEvent = await db.calendarEvent.findFirst({
    where: {
      source: "agent_progress",
      sourceRef: project.id,
    },
  });

  if (existingEvent) {
    await db.calendarEvent.update({
      where: { id: existingEvent.id },
      data: {
        title: project.name,
        startAt: project.endDate,
        endAt: project.endDate,
        progressPct: pct,
        priority: priorityVal,
      },
    });
  } else {
    await db.calendarEvent.create({
      data: {
        workspaceId: project.workspaceId,
        projectId: project.id,
        title: project.name,
        startAt: project.endDate,
        endAt: project.endDate,
        source: "agent_progress",
        sourceRef: project.id,
        progressPct: pct,
        priority: priorityVal,
      },
    });
  }

  return { success: true, pct, isArchived: isArchivedMode };
}
