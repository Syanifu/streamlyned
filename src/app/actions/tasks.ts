"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { parseNaturalDate } from "@/lib/date-parser";
import { revalidatePath } from "next/cache";
import { indexEntity } from "@/lib/ai/search";

/**
 * Creates a task in a list
 */
export async function createTaskAction(
  projectId: string,
  taskListId: string,
  title: string,
  notes: string,
  dueDateText: string,
  assigneeIds: string[],
  priority: string = "P4"
) {
  try {
    const session = await requireSession();

    // Verify user belongs to project
    const projectMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!projectMember) throw new Error("Access Denied: You are not a member of this project.");

    // Parse natural language date if provided
    let dueDateEnd: Date | null = null;
    if (dueDateText) {
      dueDateEnd = parseNaturalDate(dueDateText);
    }

    // Determine position (find max position in list and add 1000)
    const lastTask = await db.task.findFirst({
      where: { taskListId },
      orderBy: { position: "desc" },
    });
    const position = lastTask ? lastTask.position + 1000.0 : 1000.0;

    // Create task
    const task = await db.task.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        taskListId,
        title: title.trim(),
        notes: notes?.trim() || null,
        dueDateEnd,
        position,
        priority,
      },
    });

    // Index task in vector search
    await indexEntity(session.workspace.id, "TASK", task.id, projectId, task.title + " " + (task.notes || ""));

    // Create assignees
    if (assigneeIds && assigneeIds.length > 0) {
      await db.taskAssignee.createMany({
        data: assigneeIds.map((uid) => ({
          taskId: task.id,
          userId: uid,
        })),
      });
    }

    // Log action to project audit log
    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        entityType: "TASK",
        entityId: task.id,
        userId: session.user.id,
        action: "CREATE",
        description: `Created task "${task.title}"`,
        priority: task.priority,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, task };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Updates task state (title, notes, due date, status, completions)
 */
export async function updateTaskAction(
  projectId: string,
  taskId: string,
  data: {
    title?: string;
    notes?: string;
    dueDateText?: string | null;
    isCompleted?: boolean;
    visibleToClients?: boolean;
    priority?: string;
  }
) {
  try {
    const session = await requireSession();

    // Fetch existing task
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { taskList: true },
    });
    if (!task) throw new Error("Task not found.");

    // Verify user belongs to project
    const projectMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!projectMember) throw new Error("Access Denied.");

    const updateData: any = {};
    const auditLogs = [];

    if (data.title !== undefined && data.title !== task.title) {
      updateData.title = data.title.trim();
      auditLogs.push(`changed title from "${task.title}" to "${data.title}"`);
    }

    if (data.notes !== undefined && data.notes !== task.notes) {
      updateData.notes = data.notes?.trim() || null;
      auditLogs.push("updated notes");
    }

    if (data.dueDateText !== undefined) {
      if (data.dueDateText === null) {
        updateData.dueDateEnd = null;
        auditLogs.push("cleared due date");
      } else {
        const parsed = parseNaturalDate(data.dueDateText);
        if (parsed) {
          updateData.dueDateEnd = parsed;
          auditLogs.push(`changed due date to ${parsed.toLocaleDateString()}`);
        }
      }
    }

    if (data.isCompleted !== undefined && data.isCompleted !== task.isCompleted) {
      updateData.isCompleted = data.isCompleted;
      updateData.completedAt = data.isCompleted ? new Date() : null;
      auditLogs.push(data.isCompleted ? "completed the task" : "reopened the task");
    }

    if (data.visibleToClients !== undefined && data.visibleToClients !== task.visibleToClients) {
      updateData.visibleToClients = data.visibleToClients;
      auditLogs.push(data.visibleToClients ? "made task visible to clients" : "made task private (team only)");
    }

    if (data.priority !== undefined && data.priority !== task.priority) {
      updateData.priority = data.priority;
      auditLogs.push(`changed priority from "${task.priority}" to "${data.priority}"`);
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: updateData,
    });

    // Re-index task in vector search
    await indexEntity(session.workspace.id, "TASK", taskId, projectId, updatedTask.title + " " + (updatedTask.notes || ""));

    // Write all change logs
    for (const logDesc of auditLogs) {
      await db.auditLog.create({
        data: {
          workspaceId: session.workspace.id,
          projectId,
          entityType: "TASK",
          entityId: taskId,
          userId: session.user.id,
          action: "UPDATE",
          description: logDesc,
          priority: updatedTask.priority,
        },
      });
    }

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, task: updatedTask };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Reorders task within or across lists
 */
export async function moveTaskAction(
  projectId: string,
  taskId: string,
  targetListId: string,
  newPosition: number
) {
  try {
    const session = await requireSession();

    // Fetch existing task
    const task = await db.task.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new Error("Task not found.");

    // Verify user belongs to project
    const projectMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!projectMember) throw new Error("Access Denied.");

    const sourceListId = task.taskListId;

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        taskListId: targetListId,
        position: newPosition,
      },
    });

    if (sourceListId !== targetListId) {
      const sourceList = await db.taskList.findUnique({ where: { id: sourceListId } });
      const destList = await db.taskList.findUnique({ where: { id: targetListId } });
      await db.auditLog.create({
        data: {
          workspaceId: session.workspace.id,
          projectId,
          entityType: "TASK",
          entityId: taskId,
          userId: session.user.id,
          action: "UPDATE",
          description: `moved task from "${sourceList?.name}" to "${destList?.name}"`,
          priority: updatedTask.priority,
        },
      });
    }

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Adds comment on task
 */
export async function addCommentAction(
  projectId: string,
  taskId: string,
  content: string,
  isClientComment: boolean
) {
  try {
    const session = await requireSession();

    // Verify user belongs to project
    const projectMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!projectMember) throw new Error("Access Denied.");

    const comment = await db.comment.create({
      data: {
        workspaceId: session.workspace.id,
        taskId,
        userId: session.user.id,
        content: content.trim(),
        isClientComment,
      },
    });

    // Write to audit log
    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        entityType: "COMMENT",
        entityId: comment.id,
        userId: session.user.id,
        action: "CREATE",
        description: `commented on task: "${content.substring(0, 30)}${content.length > 30 ? "..." : ""}"`,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, comment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
