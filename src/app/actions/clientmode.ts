"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function toggleClientVisibility(
  type: "TASK" | "DISCUSSION" | "DOC",
  id: string,
  visibleToClients: boolean
) {
  try {
    const session = await requireSession();

    if (session.role === "CLIENT") {
      throw new Error("Access Denied: Clients cannot modify content visibility.");
    }

    let projectId = "";

    if (type === "TASK") {
      const task = await db.task.findUnique({ where: { id } });
      if (!task) throw new Error("Task not found");
      projectId = task.projectId;

      await db.task.update({
        where: { id },
        data: { visibleToClients },
      });
    } else if (type === "DISCUSSION") {
      const discussion = await db.discussion.findUnique({ where: { id } });
      if (!discussion) throw new Error("Discussion not found");
      projectId = discussion.projectId;

      await db.discussion.update({
        where: { id },
        data: { visibleToClients },
      });
    } else if (type === "DOC") {
      const doc = await db.doc.findUnique({ where: { id } });
      if (!doc) throw new Error("Doc not found");
      projectId = doc.projectId;

      await db.doc.update({
        where: { id },
        data: { visibleToClients },
      });
    }

    if (projectId) {
      revalidatePath(`/dashboard/projects/${projectId}`);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
