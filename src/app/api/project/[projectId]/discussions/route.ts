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

    const url = new URL(request.url);
    const discussionId = url.searchParams.get("id");

    if (discussionId) {
      // Fetch details of a single discussion thread
      const discussion = await db.discussion.findFirst({
        where: {
          id: discussionId,
          projectId,
          workspaceId: session.workspace.id,
          ...(session.role === "CLIENT" ? { visibleToClients: true } : {}),
        },
        include: {
          user: {
            select: {
              name: true,
              avatarUrl: true,
            },
          },
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              user: {
                select: {
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      if (!discussion) {
        return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
      }

      return NextResponse.json({ discussion });
    } else {
      // Fetch all discussions in the project
      const discussions = await db.discussion.findMany({
        where: {
          projectId,
          workspaceId: session.workspace.id,
          ...(session.role === "CLIENT" ? { visibleToClients: true } : {}),
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: {
          user: {
            select: {
              name: true,
              avatarUrl: true,
            },
          },
          comments: {
            select: {
              id: true,
            },
          },
        },
      });

      return NextResponse.json({ discussions });
    }
  } catch (error: any) {
    console.error("Discussions API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
