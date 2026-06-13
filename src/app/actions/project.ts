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

export async function toggleProjectAgenticAction(projectId: string, enabled: boolean) {
  try {
    const session = await requireSession();

    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      throw new Error("Access Denied: Only admins or owners can change project settings.");
    }

    const project = await db.project.update({
      where: { id: projectId, workspaceId: session.workspace.id },
      data: { agenticEnabled: enabled },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, project };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProjectAction(
  projectId: string,
  data: { name: string; description: string; startDate?: string | null; endDate?: string | null }
) {
  try {
    const session = await requireSession();
    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      throw new Error("Access Denied: Only admins or owners can edit project details.");
    }
    if (!data.name.trim()) throw new Error("Project name cannot be empty.");

    await db.project.update({
      where: { id: projectId, workspaceId: session.workspace.id },
      data: {
        name: data.name.trim(),
        description: data.description.trim() || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        entityType: "PROJECT",
        entityId: projectId,
        userId: session.user.id,
        action: "UPDATE",
        description: `updated project details`,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProjectToolsAction(projectId: string, tools: string[]) {
  try {
    const session = await requireSession();
    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      throw new Error("Access Denied: Only admins or owners can change project tools.");
    }

    const VALID_TOOLS = ["tasks", "discussions", "chat", "docs", "calendar", "checkins"];
    const filtered = tools.filter((t) => VALID_TOOLS.includes(t));

    await db.project.update({
      where: { id: projectId, workspaceId: session.workspace.id },
      data: { tools: JSON.stringify(filtered) },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function archiveProjectAction(projectId: string, archive: boolean) {
  try {
    const session = await requireSession();
    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      throw new Error("Access Denied: Only admins or owners can archive projects.");
    }

    await db.project.update({
      where: { id: projectId, workspaceId: session.workspace.id },
      data: { isArchived: archive, archivedAt: archive ? new Date() : null },
    });

    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        entityType: "PROJECT",
        entityId: projectId,
        userId: session.user.id,
        action: "UPDATE",
        description: archive ? `archived the project` : `unarchived the project`,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProjectAction(projectId: string) {
  try {
    const session = await requireSession();
    if (session.role !== "OWNER") {
      throw new Error("Access Denied: Only the workspace owner can delete projects.");
    }

    const project = await db.project.findFirst({
      where: { id: projectId, workspaceId: session.workspace.id, deletedAt: null },
    });
    if (!project) throw new Error("Project not found.");

    await db.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });

    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        entityType: "PROJECT",
        entityId: projectId,
        userId: session.user.id,
        action: "DELETE",
        description: `deleted the project "${project.name}"`,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addProjectMemberAction(projectId: string, userId: string) {
  try {
    const session = await requireSession();
    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      throw new Error("Access Denied: Only admins or owners can add project members.");
    }

    // Verify project belongs to this workspace
    const project = await db.project.findFirst({
      where: { id: projectId, workspaceId: session.workspace.id, deletedAt: null },
    });
    if (!project) throw new Error("Project not found.");

    // Verify user is a workspace member
    const workspaceMember = await db.workspaceMember.findFirst({
      where: { workspaceId: session.workspace.id, userId },
      include: { user: true },
    });
    if (!workspaceMember) throw new Error("User is not a member of this workspace.");

    // Check not already a project member
    const existing = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (existing) throw new Error("User is already a project member.");

    await db.projectMember.create({
      data: {
        projectId,
        userId,
        visibleTools: project.tools,
      },
    });

    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        entityType: "PROJECT",
        entityId: projectId,
        userId: session.user.id,
        action: "UPDATE",
        description: `added "${workspaceMember.user.name}" to the project`,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeProjectMemberAction(projectId: string, memberId: string) {
  try {
    const session = await requireSession();
    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      throw new Error("Access Denied: Only admins or owners can remove project members.");
    }

    const member = await db.projectMember.findUnique({
      where: { id: memberId },
      include: { user: true, project: true },
    });

    if (!member || member.project.workspaceId !== session.workspace.id) {
      throw new Error("Member not found.");
    }
    if (member.userId === session.user.id) {
      throw new Error("You cannot remove yourself from the project.");
    }

    await db.projectMember.delete({ where: { id: memberId } });

    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        entityType: "PROJECT",
        entityId: projectId,
        userId: session.user.id,
        action: "UPDATE",
        description: `removed "${member.user.name}" from the project`,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateMemberVisibleToolsAction(projectId: string, memberId: string, tools: string[]) {
  try {
    const session = await requireSession();
    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      throw new Error("Access Denied: Only admins or owners can change member visible tools.");
    }

    const member = await db.projectMember.findUnique({
      where: { id: memberId },
      include: { project: true },
    });

    if (!member || member.project.workspaceId !== session.workspace.id) {
      throw new Error("Member not found.");
    }

    const VALID_TOOLS = ["tasks", "discussions", "chat", "docs", "calendar", "checkins"];
    const filtered = tools.filter((t) => VALID_TOOLS.includes(t));

    await db.projectMember.update({
      where: { id: memberId },
      data: { visibleTools: JSON.stringify(filtered) },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
