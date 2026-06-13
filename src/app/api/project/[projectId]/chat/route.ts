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
      if (!visibleTools.includes("chat")) {
        return NextResponse.json({ error: "Forbidden: Chat is not enabled" }, { status: 403 });
      }
    }

    // Query messages
    const messages = await db.chatMessage.findMany({
      where: {
        projectId,
        workspaceId: session.workspace.id,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            memberships: {
              where: {
                workspaceId: session.workspace.id,
              },
              select: {
                role: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        files: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
