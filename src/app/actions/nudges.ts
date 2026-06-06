"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { parseNaturalDate } from "@/lib/date-parser";
import { revalidatePath } from "next/cache";
import { aiGateway } from "@/lib/ai/gateway";

export async function createTaskFromNudgeAction(projectId: string, title: string, priority: string = "P4") {
  try {
    const session = await requireSession();

    const firstList = await db.taskList.findFirst({
      where: { projectId },
      orderBy: { position: "asc" },
    });
    if (!firstList) throw new Error("No task list found for this project.");

    const task = await db.task.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        taskListId: firstList.id,
        title: title.trim(),
        position: 1000.0,
        priority,
      },
    });

    // Log action to project audit log
    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        entityType: "TASK",
        entityId: task.id,
        userId: session.user.id,
        action: "CREATE",
        description: `Created task "${task.title}" (nudge)`,
        priority: task.priority,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, task };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAndAssignTaskFromNudgeAction(
  projectId: string,
  text: string,
  nameTag: string,
  priority: string = "P4"
) {
  try {
    const session = await requireSession();

    // Find the member matching the nameTag
    const members = await db.projectMember.findMany({
      where: { projectId },
      include: { user: true },
    });

    const cleanTag = nameTag.replace("@", "").toLowerCase().trim();
    const matchedMember = members.find(
      (m) => m.user.name.toLowerCase().includes(cleanTag)
    );

    if (!matchedMember) {
      throw new Error(`No team member named "${nameTag}" found in this project.`);
    }

    // Clean up task title from text (remove name tag references)
    let title = text.replace(new RegExp(`ask\\s+${cleanTag}\\s+to`, "i"), "")
                    .replace(new RegExp(`@${cleanTag}`, "i"), "")
                    .trim();
    if (!title) title = `Task assigned to ${matchedMember.user.name}`;

    const firstList = await db.taskList.findFirst({
      where: { projectId },
      orderBy: { position: "asc" },
    });
    if (!firstList) throw new Error("No task list found.");

    const task = await db.task.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        taskListId: firstList.id,
        title,
        position: 1000.0,
        priority,
      },
    });

    await db.taskAssignee.create({
      data: {
        taskId: task.id,
        userId: matchedMember.user.id,
      },
    });

    // Log action to project audit log
    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        entityType: "TASK",
        entityId: task.id,
        userId: session.user.id,
        action: "CREATE",
        description: `Created task "${task.title}" and assigned to ${matchedMember.user.name} (nudge)`,
        priority: task.priority,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, task, assigneeName: matchedMember.user.name };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setDueDateOnNearestTaskAction(projectId: string, dateText: string) {
  try {
    const session = await requireSession();
    const nearestTask = await db.task.findFirst({
      where: { projectId, isCompleted: false },
      orderBy: { createdAt: "desc" },
    });
    if (!nearestTask) throw new Error("No active tasks found to set due date.");

    const parsedDate = parseNaturalDate(dateText);
    if (!parsedDate) throw new Error(`Could not parse due date "${dateText}".`);

    await db.task.update({
      where: { id: nearestTask.id },
      data: { dueDateEnd: parsedDate },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, taskTitle: nearestTask.title, dueDate: parsedDate };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reassignTaskAction(taskId: string, userId: string, projectId: string) {
  try {
    const session = await requireSession();

    // Clear current assignees
    await db.taskAssignee.deleteMany({
      where: { taskId },
    });

    // Assign to new user
    await db.taskAssignee.create({
      data: {
        taskId,
        userId,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function inferPriorityAction(text: string, projectId: string) {
  try {
    const session = await requireSession();
    
    // Quick rule-based checks
    const lower = text.toLowerCase();
    let priority = "P4";
    
    if (lower.includes("pull the contract") || lower.includes("threatening") || lower.includes("emergency") || lower.includes("blocker") || lower.includes("by eod") || lower.includes("critical") || lower.includes("fire")) {
      priority = "P1";
    } else if (lower.includes("urgent") || lower.includes("important") || lower.includes("asap") || lower.includes("high priority")) {
      priority = "P2";
    } else if (lower.includes("deadline") || lower.includes("by friday") || lower.includes("medium")) {
      priority = "P3";
    } else if (lower.includes("nice to have") || lower.includes("someday") || lower.includes("low priority") || lower.includes("maybe")) {
      priority = "P5";
    } else if (lower.includes("parked") || lower.includes("deprioritised") || lower.includes("archived")) {
      priority = "P6";
    } else {
      // Call AI for inference
      const prompt = `You are a priority inference engine for projects. Classify the following task text into one of these priorities:
- P1 (Critical - Blockers, client escalations, launch-day issues, threats to pull contracts)
- P2 (High - Important but not on fire)
- P3 (Medium - Standard work, upcoming deadlines)
- P4 (Normal - Business as usual, backlog)
- P5 (Low - Nice to have, someday)
- P6 (Archived - Deprioritised, parked)

Text: "${text}"

Respond with ONLY the priority key (P1, P2, P3, P4, P5, P6).`;

      const res = await aiGateway.complete(session.workspace.id, prompt);
      const cleanRes = res.text.trim().substring(0, 10).toUpperCase();
      const match = ["P1", "P2", "P3", "P4", "P5", "P6"].find(p => cleanRes.includes(p));
      if (match) {
        priority = match;
      }
    }
    
    return { success: true, priority };
  } catch (error: any) {
    return { success: false, error: error.message, priority: "P4" };
  }
}
