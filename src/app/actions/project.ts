"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createProjectAction(data: {
  name: string;
  description: string;
  startDate?: string | null;
  endDate?: string | null;
}) {
  try {
    const session = await requireSession();

    if (session.role === "CLIENT") {
      throw new Error("Access Denied: Clients cannot create projects.");
    }

    if (!data.name.trim()) {
      throw new Error("Project name cannot be empty.");
    }

    const parsedStart = data.startDate ? new Date(data.startDate) : null;
    const parsedEnd = data.endDate ? new Date(data.endDate) : null;

    // 1. Create project
    const project = await db.project.create({
      data: {
        workspaceId: session.workspace.id,
        name: data.name.trim(),
        description: data.description.trim() || null,
        startDate: parsedStart,
        endDate: parsedEnd,
        tools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]),
      },
    });

    // 2. Add creator as project member
    await db.projectMember.create({
      data: {
        projectId: project.id,
        userId: session.user.id,
        visibleTools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]),
      },
    });

    // 3. Create a default task list
    await db.taskList.create({
      data: {
        projectId: project.id,
        name: "General Tasks",
        position: 1000.0,
      },
    });

    // 4. Log the action
    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId: project.id,
        entityType: "PROJECT",
        entityId: project.id,
        userId: session.user.id,
        action: "CREATE",
        description: `created the project "${project.name}"`,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");
    return { success: true, projectId: project.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
