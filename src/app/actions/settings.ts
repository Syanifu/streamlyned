"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Saves AI Gateway settings for the workspace
 */
export async function saveAiSettingsAction(
  provider: string,
  apiKey: string,
  completionModel: string,
  embeddingsModel: string
) {
  try {
    const session = await requireSession();

    // Verify role
    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      throw new Error("Access Denied: Only workspace owners and admins can edit settings.");
    }

    // Upsert AI Settings
    await db.aiSettings.upsert({
      where: { workspaceId: session.workspace.id },
      update: {
        provider,
        apiKey: apiKey.trim() || null,
        completionModel,
        embeddingsModel,
      },
      create: {
        workspaceId: session.workspace.id,
        provider,
        apiKey: apiKey.trim() || null,
        completionModel,
        embeddingsModel,
      },
    });

    // Write to audit log
    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        entityType: "SETTINGS",
        entityId: session.workspace.id,
        userId: session.user.id,
        action: "UPDATE",
        description: `updated AI Gateway provider configuration to "${provider}"`,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

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
