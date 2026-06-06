"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Updates the user's name and avatar in SQLite
 */
export async function updateProfileAction(data: {
  name: string;
  avatarUrl: string;
  coverUrl: string;
  planTier: string;
}) {
  try {
    const session = await requireSession();

    if (!data.name.trim()) {
      throw new Error("Name cannot be empty.");
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name.trim(),
        avatarUrl: data.avatarUrl,
        coverUrl: data.coverUrl,
        planTier: data.planTier,
      },
    });

    // Log the change
    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        entityType: "USER",
        entityId: session.user.id,
        userId: session.user.id,
        action: "UPDATE",
        description: `updated their profile name to "${updatedUser.name}" and avatar`,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/profile");
    return { success: true, user: updatedUser };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
