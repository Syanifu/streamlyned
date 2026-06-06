"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { parseNaturalEvent } from "@/lib/calendar-parser";
import { revalidatePath } from "next/cache";

/**
 * Creates a calendar event.
 * Handles combined natural-language input, e.g. "Weekly Sync every Wednesday at 3pm"
 */
export async function createCalendarEventAction(
  projectId: string,
  rawInput: string,
  location?: string,
  videoCallLink?: string,
  priority: string = "P4"
) {
  try {
    const session = await requireSession();

    // Verify project membership
    const projectMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!projectMember) throw new Error("Access Denied.");

    // Extract title and timing details from rawInput
    // E.g. "Board Meeting tomorrow at 11am" -> title: "Board Meeting", timeDetails: "tomorrow at 11am"
    let title = rawInput.trim();
    let timeText = rawInput.trim();

    const timeKeywords = [" every ", " at ", " tomorrow", " next ", " on ", " today"];
    let firstKeywordIndex = -1;

    for (const kw of timeKeywords) {
      const idx = title.toLowerCase().indexOf(kw);
      if (idx !== -1 && (firstKeywordIndex === -1 || idx < firstKeywordIndex)) {
        firstKeywordIndex = idx;
      }
    }

    if (firstKeywordIndex !== -1) {
      title = rawInput.substring(0, firstKeywordIndex).trim();
      timeText = rawInput.substring(firstKeywordIndex).trim();
    }

    if (!title) {
      title = "Untitled Event";
    }

    // Parse the timing details
    const { startAt, endAt, recurrence } = parseNaturalEvent(timeText);

    // Create Event
    const event = await db.calendarEvent.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        title,
        description: `Created via natural language: "${rawInput}"`,
        startAt,
        endAt,
        recurrence,
        location: location?.trim() || null,
        videoCallLink: videoCallLink?.trim() || null,
        priority,
      },
    });

    // Automatically add the creator as an attendee
    await db.calendarEventAttendee.create({
      data: {
        eventId: event.id,
        userId: session.user.id,
      },
    });

    // Write to audit log
    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        entityType: "EVENT",
        entityId: event.id,
        userId: session.user.id,
        action: "CREATE",
        description: `scheduled event "${event.title}" for ${event.startAt.toLocaleString()}`,
        priority: event.priority,
      },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, event };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
