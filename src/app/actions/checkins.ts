"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createCheckInQuestion(
  projectId: string,
  question: string,
  scheduleDay: string,
  scheduleTime: string
) {
  try {
    const session = await requireSession();

    // Verify user belongs to project and is NOT a client
    const projectMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!projectMember) throw new Error("Access Denied: You are not a member of this project.");
    if (session.role === "CLIENT") throw new Error("Access Denied: Clients cannot create check-ins.");

    const q = await db.checkInQuestion.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        question: question.trim(),
        scheduleDay,
        scheduleTime,
        active: true,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, question: q };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleCheckInQuestionActive(questionId: string, active: boolean) {
  try {
    const session = await requireSession();
    if (session.role === "CLIENT") throw new Error("Access Denied: Clients cannot modify check-ins.");

    const question = await db.checkInQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new Error("Question not found.");

    const updated = await db.checkInQuestion.update({
      where: { id: questionId },
      data: { active },
    });

    revalidatePath(`/dashboard/projects/${question.projectId}`);
    return { success: true, question: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCheckInQuestion(questionId: string) {
  try {
    const session = await requireSession();
    if (session.role === "CLIENT") throw new Error("Access Denied: Clients cannot modify check-ins.");

    const question = await db.checkInQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new Error("Question not found.");

    await db.checkInQuestion.delete({
      where: { id: questionId },
    });

    revalidatePath(`/dashboard/projects/${question.projectId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitCheckInAnswer(questionId: string, content: string) {
  try {
    const session = await requireSession();

    const question = await db.checkInQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new Error("Question not found.");

    const projectMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId: question.projectId, userId: session.user.id } },
    });
    if (!projectMember) throw new Error("Access Denied: You are not a member of this project.");

    const answer = await db.checkInAnswer.create({
      data: {
        questionId,
        userId: session.user.id,
        content: content.trim(),
      },
    });

    revalidatePath(`/dashboard/projects/${question.projectId}`);
    return { success: true, answer };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
