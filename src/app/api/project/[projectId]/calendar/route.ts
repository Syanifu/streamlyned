import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    // Verify user membership in project
    const member = await db.projectMember.findFirst({
      where: {
        projectId,
        userId: session.user.id,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Forbidden: Not a project member" }, { status: 403 });
    }

    // Verify CLIENT role visibility
    if (session.role === "CLIENT") {
      const visibleTools = JSON.parse(member.visibleTools) as string[];
      if (!visibleTools.includes("calendar")) {
        return NextResponse.json({ error: "Forbidden: Calendar is not enabled" }, { status: 403 });
      }
    }

    // Query events with attendees
    const events = await db.calendarEvent.findMany({
      where: {
        projectId,
        workspaceId: session.workspace.id,
      },
      orderBy: { startAt: "asc" },
      include: {
        attendees: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
      },
    });

    // Query uncompleted tasks with due dates in this project
    const tasks = await db.task.findMany({
      where: {
        projectId,
        workspaceId: session.workspace.id,
        isCompleted: false,
        dueDateEnd: { not: null },
      },
      select: {
        id: true,
        title: true,
        dueDateEnd: true,
        priority: true,
      },
    });

    return NextResponse.json({
      events,
      tasks,
      workspaceSlug: session.workspace.slug,
    });
  } catch (error: any) {
    console.error("Calendar API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
