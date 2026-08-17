"use server";

import { requireSession } from "@/lib/auth";
import { submitDocumentForApproval, processSignoff } from "@/lib/approvals/engine";
import { revalidatePath } from "next/cache";

/**
 * Server Action to submit a document for approval.
 */
export async function submitForApprovalAction(
  documentType: string,
  documentId: string,
  amount: number
) {
  try {
    const session = await requireSession();

    const request = await submitDocumentForApproval(
      session.workspace.id,
      documentType.toUpperCase(),
      documentId,
      amount
    );

    revalidatePath("/dashboard/tasks"); // Or other routes displaying pending items
    return { success: true, request };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Server Action to approve or reject a specific signoff step.
 */
export async function actOnApprovalAction(
  signoffId: string,
  action: "APPROVED" | "REJECTED",
  comment?: string
) {
  try {
    const session = await requireSession();

    const result = await processSignoff(
      signoffId,
      session.user.id,
      action,
      comment
    );

    revalidatePath("/dashboard/tasks");
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
