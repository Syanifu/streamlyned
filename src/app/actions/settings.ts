"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Invites a new user to the workspace
 */
export async function inviteUserAction(email: string, name: string, role: string) {
  try {
    const session = await requireSession();

    // Verify role
    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      throw new Error("Access Denied: Only workspace owners and admins can invite members.");
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already in workspace
    const existingMembership = await db.workspaceMember.findFirst({
      where: {
        workspaceId: session.workspace.id,
        user: { email: cleanEmail },
      },
    });

    if (existingMembership) {
      throw new Error("This user is already a member of this workspace.");
    }

    // Find or create User
    let user = await db.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      user = await db.user.create({
        data: {
          email: cleanEmail,
          name: name.trim(),
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name.replace(/\s+/g, "")}`,
        },
      });
    }

    // Add membership
    await db.workspaceMember.create({
      data: {
        workspaceId: session.workspace.id,
        userId: user.id,
        role,
      },
    });

    // Write to audit log
    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        entityType: "USER",
        entityId: user.id,
        userId: session.user.id,
        action: "CREATE",
        description: `invited user "${user.name}" as ${role}`,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Changes a workspace member's role. OWNER only.
 */
export async function changeUserRoleAction(memberId: string, newRole: string) {
  try {
    const session = await requireSession();

    if (session.role !== "OWNER") {
      throw new Error("Access Denied: Only the workspace owner can change member roles.");
    }

    const ALLOWED_ROLES = ["ADMIN", "MEMBER", "CLIENT"];
    if (!ALLOWED_ROLES.includes(newRole)) {
      throw new Error("Invalid role.");
    }

    const member = await db.workspaceMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member || member.workspaceId !== session.workspace.id) {
      throw new Error("Member not found.");
    }

    if (member.userId === session.user.id) {
      throw new Error("You cannot change your own role.");
    }

    if (member.role === "OWNER") {
      throw new Error("Cannot change the role of another owner.");
    }

    await db.workspaceMember.update({
      where: { id: memberId },
      data: { role: newRole },
    });

    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        entityType: "USER",
        entityId: member.userId,
        userId: session.user.id,
        action: "UPDATE",
        description: `changed role of "${member.user.name}" from ${member.role} to ${newRole}`,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Removes a user from the workspace and all its projects. OWNER only.
 */
export async function removeWorkspaceMemberAction(memberId: string) {
  try {
    const session = await requireSession();

    if (session.role !== "OWNER") {
      throw new Error("Access Denied: Only the workspace owner can remove members.");
    }

    const member = await db.workspaceMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member || member.workspaceId !== session.workspace.id) {
      throw new Error("Member not found.");
    }

    if (member.userId === session.user.id) {
      throw new Error("You cannot remove yourself from the workspace.");
    }

    if (member.role === "OWNER") {
      throw new Error("Cannot remove another owner.");
    }

    // Remove from all projects within this workspace
    const workspaceProjects = await db.project.findMany({
      where: { workspaceId: session.workspace.id },
      select: { id: true },
    });

    await db.projectMember.deleteMany({
      where: {
        userId: member.userId,
        projectId: { in: workspaceProjects.map((p) => p.id) },
      },
    });

    await db.workspaceMember.delete({ where: { id: memberId } });

    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        entityType: "USER",
        entityId: member.userId,
        userId: session.user.id,
        action: "DELETE",
        description: `removed user "${member.user.name}" from the workspace`,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
