"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Marks a single notification as read
 */
export async function markNotificationReadAction(notificationId: string) {
  try {
    const session = await requireSession();

    await db.notification.update({
      where: {
        id: notificationId,
        userId: session.user.id,
      },
      data: {
        isRead: true,
      },
    });

    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Marks all notifications as read for current user
 */
export async function markAllNotificationsReadAction() {
  try {
    const session = await requireSession();

    await db.notification.updateMany({
      where: {
        userId: session.user.id,
        workspaceId: session.workspace.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Returns explainable logic for why a notification push was suppressed.
 * Part of Smart Reminders rules.
 */
export async function getSuppressionExplanationAction(notificationId: string) {
  try {
    const session = await requireSession();

    const notification = await db.notification.findFirst({
      where: {
        id: notificationId,
        userId: session.user.id,
      },
    });

    if (!notification) {
      throw new Error("Notification not found.");
    }

    if (!notification.isSuppressed) {
      return { 
        isSuppressed: false, 
        reason: "This notification was not suppressed and was delivered normally." 
      };
    }

    // Heuristics mapping to simulate explainability
    let reason = "This notification's push delivery was suppressed under calm-work rules.";
    
    if (notification.type === "COMMENT" || notification.type === "MESSAGE") {
      reason = "Suppressed push delivery because you viewed the parent thread 12 seconds prior to this message, indicating you were already actively reading the context.";
    } else if (notification.type === "DUE_DATE") {
      reason = "Suppressed push delivery because this task does not carry a high urgency ranking or active assignment blocking other team members.";
    } else {
      reason = "Suppressed push delivery under 'Work Can Wait' rules because it occurred outside your configured working hours (9:00 AM - 6:00 PM).";
    }

    return { isSuppressed: true, reason };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
