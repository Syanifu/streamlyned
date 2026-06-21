import "server-only";
import { db } from "@/lib/db";
import type { Ctx } from "./context";

/** Returns a single task, enforcing workspace + CLIENT visibility. Returns null (not 404) on miss. */
export async function getTask(ctx: Ctx, taskId: string) {
  const task = await db.task.findFirst({
    where: { id: taskId, taskList: { project: { workspaceId: ctx.workspaceId } } },
    include: { assignees: { include: { user: true } }, attachments: true, comments: true },
  });
  if (!task) return null;
  if (ctx.role === "CLIENT" && !task.visibleToClients) return null;
  return task;
}

/** Lists tasks for a project list, with CLIENT filter applied. */
export async function listTasksForList(ctx: Ctx, taskListId: string) {
  const tasks = await db.task.findMany({
    where: { taskListId, taskList: { project: { workspaceId: ctx.workspaceId } } },
    orderBy: { position: "asc" },
    include: { assignees: { include: { user: true } } },
  });
  if (ctx.role === "CLIENT") return tasks.filter((t) => t.visibleToClients);
  return tasks;
}

/** Creates a task. Validates that the task list belongs to this workspace. */
export async function createTask(
  ctx: Ctx,
  data: {
    taskListId: string;
    projectId: string;
    title: string;
    notes?: string;
    position: number;
    priority?: string;
    visibleToClients?: boolean;
  }
) {
  const list = await db.taskList.findFirst({
    where: { id: data.taskListId, project: { workspaceId: ctx.workspaceId } },
  });
  if (!list) throw new Error("Task list not found");

  return db.task.create({
    data: {
      workspaceId: ctx.workspaceId,
      taskListId: data.taskListId,
      projectId: data.projectId,
      title: data.title,
      notes: data.notes,
      position: data.position,
      priority: data.priority ?? "P4",
      visibleToClients: data.visibleToClients ?? true,
    },
  });
}

/** Updates a task. Re-verifies ownership to prevent IDOR. */
export async function updateTask(
  ctx: Ctx,
  taskId: string,
  data: Partial<{
    title: string;
    notes: string;
    isCompleted: boolean;
    position: number;
    priority: string;
    visibleToClients: boolean;
    taskListId: string;
  }>
) {
  const task = await getTask(ctx, taskId);
  if (!task) throw new Error("Task not found");

  return db.task.update({ where: { id: taskId }, data: { ...data, updatedAt: new Date() } });
}
