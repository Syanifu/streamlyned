"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { parseNaturalEvent } from "@/lib/calendar-parser";
import { revalidatePath } from "next/cache";
import { aiGateway } from "@/lib/ai/gateway";

/**
 * Creates a calendar event from structured fields (no NLP parsing).
 */
export async function createStructuredCalendarEventAction(
  projectId: string,
  data: {
    title: string;
    date: string;       // YYYY-MM-DD
    startTime: string;  // HH:mm
    endTime: string;    // HH:mm
    description?: string;
    location?: string;
    videoCallLink?: string;
    priority?: string;
    attendeeIds?: string[];
  }
) {
  try {
    const session = await requireSession();

    const projectMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!projectMember) throw new Error("Access Denied.");

    const [yy, mm, dd] = data.date.split("-").map(Number);
    const [startH, startM] = data.startTime.split(":").map(Number);
    const [endH, endM] = data.endTime.split(":").map(Number);
    const startAt = new Date(yy, mm - 1, dd, startH, startM);
    const endAt = new Date(yy, mm - 1, dd, endH, endM);
    if (endAt <= startAt) endAt.setHours(startAt.getHours() + 1);

    const event = await db.calendarEvent.create({
      data: {
        workspaceId: session.workspace.id,
        projectId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        startAt,
        endAt,
        recurrence: null,
        location: data.location?.trim() || null,
        videoCallLink: data.videoCallLink?.trim() || null,
        priority: data.priority || "P4",
      },
    });

    // Add creator + specified attendees
    const attendeeSet = new Set<string>([session.user.id, ...(data.attendeeIds || [])]);
    await db.calendarEventAttendee.createMany({
      data: [...attendeeSet].map((userId) => ({ eventId: event.id, userId })),
      skipDuplicates: true,
    });

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

/**
 * Updates an existing calendar event.
 */
export async function updateCalendarEventAction(
  eventId: string,
  data: {
    title?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    location?: string;
    videoCallLink?: string;
    priority?: string;
    attendeeIds?: string[];
  }
) {
  try {
    const session = await requireSession();

    const existing = await db.calendarEvent.findFirst({
      where: { id: eventId, workspaceId: session.workspace.id },
    });
    if (!existing) throw new Error("Event not found.");

    let startAt = existing.startAt;
    let endAt = existing.endAt;

    if (data.date && data.startTime && data.endTime) {
      const [yy, mm, dd] = data.date.split("-").map(Number);
      const [startH, startM] = data.startTime.split(":").map(Number);
      const [endH, endM] = data.endTime.split(":").map(Number);
      startAt = new Date(yy, mm - 1, dd, startH, startM);
      endAt = new Date(yy, mm - 1, dd, endH, endM);
      if (endAt <= startAt) endAt.setHours(startAt.getHours() + 1);
    }

    const updated = await db.calendarEvent.update({
      where: { id: eventId },
      data: {
        ...(data.title && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.location !== undefined && { location: data.location?.trim() || null }),
        ...(data.videoCallLink !== undefined && { videoCallLink: data.videoCallLink?.trim() || null }),
        ...(data.priority && { priority: data.priority }),
        startAt,
        endAt,
      },
    });

    if (data.attendeeIds !== undefined) {
      await db.calendarEventAttendee.deleteMany({ where: { eventId } });
      const attendeeSet = new Set<string>([session.user.id, ...data.attendeeIds]);
      await db.calendarEventAttendee.createMany({
        data: [...attendeeSet].map((userId) => ({ eventId, userId })),
        skipDuplicates: true,
      });
    }

    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        projectId: existing.projectId,
        entityType: "EVENT",
        entityId: eventId,
        userId: session.user.id,
        action: "UPDATE",
        description: `updated event "${updated.title}"`,
      },
    });

    revalidatePath(`/dashboard/projects/${existing.projectId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Deletes a calendar event.
 */
export async function deleteCalendarEventAction(eventId: string) {
  try {
    const session = await requireSession();

    const existing = await db.calendarEvent.findFirst({
      where: { id: eventId, workspaceId: session.workspace.id },
    });
    if (!existing) throw new Error("Event not found.");

    await db.calendarEvent.delete({ where: { id: eventId } });

    revalidatePath(`/dashboard/projects/${existing.projectId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

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

export interface ParsedEventDraft {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  location: string;
  videoCallLink: string;
  priority: string;
}

export async function parseMeetingNotesAction(
  projectId: string,
  notes: string
): Promise<{ success: true; events: ParsedEventDraft[] } | { success: false; error: string }> {
  try {
    const session = await requireSession();

    const projectMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    });
    if (!projectMember) throw new Error("Access Denied.");

    const today = new Date().toISOString().split("T")[0];

    const prompt = `You are a calendar assistant. Today's date is ${today}.

Extract ALL calendar events, meetings, deadlines, and scheduled items from the meeting notes below.
Return ONLY valid JSON — no markdown, no explanation.

Rules:
- dates must be YYYY-MM-DD format
- times must be HH:mm (24h) format
- priority must be one of: P1, P2, P3, P4, P5 (P1=critical, P4=normal)
- if no specific time is mentioned, use 09:00 - 10:00 as defaults
- if no specific date is mentioned, use today (${today})
- include action items or follow-ups as separate events if they have a clear deadline
- description should summarise relevant context from the notes for that specific event

Return format:
{
  "events": [
    {
      "title": "string",
      "date": "YYYY-MM-DD",
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "description": "string",
      "location": "string",
      "videoCallLink": "string",
      "priority": "P4"
    }
  ]
}

Meeting notes:
${notes.slice(0, 4000)}`;

    const res = await aiGateway.complete(session.workspace.id, prompt, { type: "json_object" });

    let parsed: { events: ParsedEventDraft[] };
    try {
      parsed = JSON.parse(res.text);
    } catch {
      throw new Error("AI returned invalid JSON. Please try again.");
    }

    if (!Array.isArray(parsed?.events)) throw new Error("No events found in the notes.");

    const events: ParsedEventDraft[] = parsed.events.map((e: any) => ({
      title: String(e.title || "Untitled Event").trim(),
      date: /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : today,
      startTime: /^\d{2}:\d{2}$/.test(e.startTime) ? e.startTime : "09:00",
      endTime: /^\d{2}:\d{2}$/.test(e.endTime) ? e.endTime : "10:00",
      description: String(e.description || "").trim(),
      location: String(e.location || "").trim(),
      videoCallLink: String(e.videoCallLink || "").trim(),
      priority: ["P1","P2","P3","P4","P5"].includes(e.priority) ? e.priority : "P4",
    }));

    return { success: true, events };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
