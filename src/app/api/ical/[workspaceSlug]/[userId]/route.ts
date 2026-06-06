import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function formatDateToiCal(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string; userId: string }> }
) {
  try {
    const { workspaceSlug, userId } = await params;

    // Verify workspace and user membership
    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!workspace || workspace.members.length === 0) {
      return new Response("Unauthorized or Invalid parameters", { status: 401 });
    }

    // Query all project events the user belongs to
    const events = await db.calendarEvent.findMany({
      where: {
        workspaceId: workspace.id,
        project: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    });

    // Query all uncompleted tasks with due dates assigned to the user
    const tasks = await db.task.findMany({
      where: {
        workspaceId: workspace.id,
        isCompleted: false,
        dueDateEnd: { not: null },
        assignees: {
          some: {
            userId,
          },
        },
      },
      include: {
        taskList: {
          include: {
            project: true,
          },
        },
      },
    });

    // Generate iCal text
    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Streamlyned//Calendar Feed//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    // Add Events
    for (const event of events) {
      const uid = `event-${event.id}@streamlyned.com`;
      const start = formatDateToiCal(event.startAt);
      const end = formatDateToiCal(event.endAt);
      
      icsContent.push("BEGIN:VEVENT");
      icsContent.push(`UID:${uid}`);
      icsContent.push(`DTSTAMP:${formatDateToiCal(new Date())}`);
      icsContent.push(`DTSTART:${start}`);
      icsContent.push(`DTEND:${end}`);
      icsContent.push(`SUMMARY:${event.title}`);
      if (event.description) {
        icsContent.push(`DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`);
      }
      if (event.location) {
        icsContent.push(`LOCATION:${event.location}`);
      }
      if (event.recurrence) {
        icsContent.push(`RRULE:FREQ=${event.recurrence}`);
      }
      icsContent.push("END:VEVENT");
    }

    // Add Tasks as all-day events
    for (const task of tasks) {
      if (!task.dueDateEnd) continue;
      const uid = `task-due-${task.id}@streamlyned.com`;
      
      // All day format (YYYYMMDD)
      const dueDate = task.dueDateEnd.toISOString().split("T")[0].replace(/-/g, "");
      
      icsContent.push("BEGIN:VEVENT");
      icsContent.push(`UID:${uid}`);
      icsContent.push(`DTSTAMP:${formatDateToiCal(new Date())}`);
      // All day syntax
      icsContent.push(`DTSTART;VALUE=DATE:${dueDate}`);
      icsContent.push(`SUMMARY:Task Due: ${task.title}`);
      icsContent.push(
        `DESCRIPTION:Project: ${task.taskList.project.name}\\nNotes: ${task.notes || "None"}`
      );
      icsContent.push("END:VEVENT");
    }

    icsContent.push("END:VCALENDAR");

    return new Response(icsContent.join("\r\n"), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="streamlyned-calendar-${userId}.ics"`,
      },
    });
  } catch (error) {
    console.error("iCal feed generation error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
